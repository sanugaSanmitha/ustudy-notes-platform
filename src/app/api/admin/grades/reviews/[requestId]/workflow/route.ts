import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminUser, requireVerificationReviewer } from '@/lib/grades/admin';
import {
  adminTakeVerificationRequest,
  assignAdminReviewRequest,
  changeVerificationPriority,
  escalateVerificationRequest,
  requestStudentInformation,
  resolveVerificationReassignment,
} from '@/lib/grades/admin-review';
import { createReviewAction } from '@/lib/grades/review-pipeline';
import { applyRateLimitResponse, requireAdminCsrf } from '@/lib/api/admin-guard';
import { resolveReviewActorRole, VERIFICATION_PRIORITIES } from '@/lib/grades/verification-workflow';
import { adminClient } from '@/lib/supabase/admin';

const workflowSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('change_priority'),
    priority: z.enum(VERIFICATION_PRIORITIES),
  }),
  z.object({ action: z.literal('escalate') }),
  z.object({ action: z.literal('take') }),
  z.object({
    action: z.literal('remove_assignment'),
  }),
  z.object({
    action: z.literal('request_info'),
    message: z.string().trim().min(10).max(1000),
  }),
  z.object({
    action: z.literal('resolve_reassignment'),
    decision: z.enum(['approve', 'reject']),
    newAssigneeUserId: z.string().uuid().nullable().optional(),
  }),
]);

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { requestId: string } }) {
  const csrfError = requireAdminCsrf(request);
  if (csrfError) return csrfError;

  const parsed = workflowSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const isAdminOnly = ['change_priority', 'escalate', 'take', 'remove_assignment', 'resolve_reassignment'].includes(
    body.action
  );

  const auth = isAdminOnly ? await requireAdminUser() : await requireVerificationReviewer();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const rateError = applyRateLimitResponse(auth.user.id);
  if (rateError) return rateError;

  const actorRole = resolveReviewActorRole({ isAdmin: auth.isAdmin, isAssistant: auth.isAssistant });

  const { data: before } = await adminClient
    .from('admin_review_requests')
    .select('id, upload_id, status, priority, assigned_to, reviewed_by')
    .eq('id', params.requestId)
    .maybeSingle();

  if (!before) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Review request not found.' } }, { status: 404 });
  }

  if (body.action === 'change_priority') {
    const result = await changeVerificationPriority(params.requestId, body.priority);
    if (!result.ok) {
      return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: 404 });
    }

    await createReviewAction({
      verificationId: before.upload_id,
      reviewRequestId: before.id,
      actorUserId: auth.user.id,
      actorRole: 'admin',
      actionType: 'priority_changed',
      fromStatus: before.status,
      toStatus: before.status,
      beforePayload: { priority: before.priority },
      afterPayload: { priority: body.priority },
    }).catch((error) => console.error('Priority audit error:', error));

    return NextResponse.json({ data: result.request }, { status: 200 });
  }

  if (body.action === 'escalate') {
    const result = await escalateVerificationRequest(params.requestId);
    if (!result.ok) {
      return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: 404 });
    }

    await createReviewAction({
      verificationId: before.upload_id,
      reviewRequestId: before.id,
      actorUserId: auth.user.id,
      actorRole: 'admin',
      actionType: 'review_escalated',
      fromStatus: before.status,
      toStatus: 'escalated',
    }).catch((error) => console.error('Escalate audit error:', error));

    return NextResponse.json({ data: result.request }, { status: 200 });
  }

  if (body.action === 'take') {
    const result = await adminTakeVerificationRequest(params.requestId, auth.user.id);
    if (!result.ok) {
      return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: 409 });
    }

    await createReviewAction({
      verificationId: before.upload_id,
      reviewRequestId: before.id,
      actorUserId: auth.user.id,
      actorRole: 'admin',
      actionType: 'review_takeover',
      fromStatus: before.status,
      toStatus: 'reviewing',
      beforePayload: { assigneeUserId: before.assigned_to, reviewedBy: before.reviewed_by },
      afterPayload: { assigneeUserId: auth.user.id },
    }).catch((error) => console.error('Take audit error:', error));

    return NextResponse.json({ data: result.request }, { status: 200 });
  }

  if (body.action === 'remove_assignment') {
    const result = await assignAdminReviewRequest(params.requestId, null, {
      adminUserId: auth.user.id,
      startReview: false,
    });
    if (!result.ok) {
      return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: 409 });
    }

    await createReviewAction({
      verificationId: before.upload_id,
      reviewRequestId: before.id,
      actorUserId: auth.user.id,
      actorRole: 'admin',
      actionType: 'review_unassigned',
      fromStatus: before.status,
      toStatus: 'pending',
      beforePayload: { assigneeUserId: before.assigned_to },
    }).catch((error) => console.error('Unassign audit error:', error));

    return NextResponse.json({ data: result.request }, { status: 200 });
  }

  if (body.action === 'request_info') {
    const result = await requestStudentInformation(params.requestId, auth.user.id, body.message);
    if (!result.ok) {
      return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: 409 });
    }

    await createReviewAction({
      verificationId: before.upload_id,
      reviewRequestId: before.id,
      actorUserId: auth.user.id,
      actorRole,
      actionType: 'request_more_info',
      fromStatus: result.previousStatus,
      toStatus: 'waiting_student',
      notes: body.message,
    }).catch((error) => console.error('Request info audit error:', error));

    return NextResponse.json({ data: result.request }, { status: 200 });
  }

  if (body.action === 'resolve_reassignment') {
    const result = await resolveVerificationReassignment(params.requestId, {
      decision: body.decision,
      newAssigneeUserId: body.newAssigneeUserId ?? null,
      adminUserId: auth.user.id,
    });
    if (!result.ok) {
      return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: 409 });
    }

    await createReviewAction({
      verificationId: before.upload_id,
      reviewRequestId: before.id,
      actorUserId: auth.user.id,
      actorRole: 'admin',
      actionType: body.decision === 'approve' ? 'reassignment_approved' : 'reassignment_rejected',
      fromStatus: 'pending_reassignment',
      toStatus: result.request?.status || before.status,
      notes: body.decision === 'approve' ? body.newAssigneeUserId || 'unassigned' : null,
      beforePayload: { previousAssignee: result.previousAssignee },
      afterPayload: { assigneeUserId: body.newAssigneeUserId ?? null },
    }).catch((error) => console.error('Resolve reassignment audit error:', error));

    return NextResponse.json({ data: result.request }, { status: 200 });
  }

  return NextResponse.json({ error: { code: 'INVALID_ACTION', message: 'Unknown action.' } }, { status: 400 });
}
