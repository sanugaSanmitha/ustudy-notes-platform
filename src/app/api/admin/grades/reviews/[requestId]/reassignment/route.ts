import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerificationReviewer } from '@/lib/grades/admin';
import { requestVerificationReassignment } from '@/lib/grades/admin-review';
import { createReviewAction } from '@/lib/grades/review-pipeline';
import { applyRateLimitResponse, requireAdminCsrf } from '@/lib/api/admin-guard';
import { resolveReviewActorRole } from '@/lib/grades/verification-workflow';
import { adminClient } from '@/lib/supabase/admin';

const requestSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { requestId: string } }) {
  const csrfError = requireAdminCsrf(request);
  if (csrfError) return csrfError;

  const auth = await requireVerificationReviewer();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  if (auth.isAdmin) {
    return NextResponse.json(
      { error: { code: 'INVALID_ACTION', message: 'Admins should reassign directly instead of requesting reassignment.' } },
      { status: 400 }
    );
  }

  const rateError = applyRateLimitResponse(auth.user.id);
  if (rateError) return rateError;

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
      { status: 400 }
    );
  }

  const { data: before } = await adminClient
    .from('admin_review_requests')
    .select('id, upload_id, status, reviewed_by')
    .eq('id', params.requestId)
    .maybeSingle();

  if (!before) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Review request not found.' } }, { status: 404 });
  }

  const result = await requestVerificationReassignment(params.requestId, auth.user.id, parsed.data.reason);
  if (!result.ok) {
    return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: 409 });
  }

  await createReviewAction({
    verificationId: before.upload_id,
    reviewRequestId: before.id,
    actorUserId: auth.user.id,
    actorRole: resolveReviewActorRole({ isAdmin: auth.isAdmin, isAssistant: auth.isAssistant }),
    actionType: 'reassignment_requested',
    fromStatus: before.status,
    toStatus: 'pending_reassignment',
    notes: parsed.data.reason,
  }).catch((error) => console.error('Reassignment request audit error:', error));

  return NextResponse.json({ data: result.request }, { status: 200 });
}
