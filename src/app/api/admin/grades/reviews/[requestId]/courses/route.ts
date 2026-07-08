import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerificationReviewer } from '@/lib/grades/admin';
import { adminClient } from '@/lib/supabase/admin';
import { fetchAdminReviewDetail } from '@/lib/grades/admin-review';
import { createReviewAction } from '@/lib/grades/review-pipeline';
import { CourseReviewRow, sanitizeCourseReviewRows } from '@/lib/grades/review-model';
import { validateCourseRows } from '@/lib/grades/course-validation';
import { applyRateLimitResponse, requireAdminCsrf } from '@/lib/api/admin-guard';
import { assertVerificationOwner, resolveReviewActorRole } from '@/lib/grades/verification-workflow';

const updateSchema = z.object({
  reviewRows: z.array(z.record(z.string(), z.unknown())).min(1),
});

export const dynamic = 'force-dynamic';

async function assertCanEdit(requestId: string, adminId: string, isAdmin: boolean) {
  const { data: reviewRequest, error } = await adminClient
    .from('admin_review_requests')
    .select('id, status, reviewed_by, assigned_to, updated_at, upload_id')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !reviewRequest) {
    return { ok: false as const, status: 404, message: 'Review request not found.' };
  }

  const ownerCheck = assertVerificationOwner(reviewRequest, adminId, { isAdmin });
  if (!ownerCheck.ok) {
    return { ok: false as const, status: 409, message: ownerCheck.message };
  }

  return { ok: true as const, reviewRequest };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const csrfError = requireAdminCsrf(request);
  if (csrfError) return csrfError;

  const auth = await requireVerificationReviewer();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const rateError = applyRateLimitResponse(auth.user.id);
  if (rateError) return rateError;

  const parsedBody = updateSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsedBody.error.issues[0]?.message || 'Invalid input' } },
      { status: 400 }
    );
  }

  const access = await assertCanEdit(params.requestId, auth.user.id, auth.isAdmin);
  if (!access.ok) {
    return NextResponse.json({ error: { code: 'LOCKED', message: access.message } }, { status: access.status });
  }

  const rows = sanitizeCourseReviewRows(parsedBody.data.reviewRows as CourseReviewRow[]);
  const issues = validateCourseRows(rows);
  if (issues.length > 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: issues[0]?.message || 'Validation failed.', details: issues } },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { error: updateError } = await adminClient
    .from('grade_verifications')
    .update({
      review_rows: rows,
      parsed_courses: rows.map((row) => ({
        courseCode: row.courseCode,
        courseName: row.courseName,
        grade: row.grade,
      })),
      updated_at: now,
    })
    .eq('id', access.reviewRequest.upload_id);

  if (updateError) {
    console.error('Admin course update error:', updateError);
    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message: 'Failed to save course changes.' } },
      { status: 500 }
    );
  }

  try {
    await createReviewAction({
      verificationId: access.reviewRequest.upload_id,
      reviewRequestId: access.reviewRequest.id,
      actorUserId: auth.user.id,
      actorRole: resolveReviewActorRole({ isAdmin: auth.isAdmin, isAssistant: auth.isAssistant }),
      actionType: 'admin_edited_courses',
      fromStatus: access.reviewRequest.status,
      toStatus: access.reviewRequest.status,
      notes: `Updated ${rows.length} course rows`,
    });
  } catch (reviewActionError) {
    console.error('Admin course edit log error:', reviewActionError);
  }

  return NextResponse.json({ data: { reviewRows: rows } }, { status: 200 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const auth = await requireVerificationReviewer();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const detailResult = await fetchAdminReviewDetail(params.requestId);
  if (!detailResult.ok) {
    if ('notFound' in detailResult && detailResult.notFound) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Admin review request not found.' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to fetch courses.' } }, { status: 500 });
  }

  const verification = (detailResult.request as { grade_verifications?: { review_rows?: unknown } | null }).grade_verifications;
  return NextResponse.json({ data: { reviewRows: verification?.review_rows || [] } }, { status: 200 });
}
