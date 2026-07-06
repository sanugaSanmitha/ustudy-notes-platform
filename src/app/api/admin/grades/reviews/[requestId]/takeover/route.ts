import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { takeoverReviewLock } from '@/lib/grades/admin-lock';
import { createReviewAction } from '@/lib/grades/review-pipeline';
import { getReviewerDisplayName } from '@/lib/grades/admin-review';
import { applyRateLimitResponse, requireAdminCsrf } from '@/lib/api/admin-guard';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { requestId: string } }) {
  const csrfError = requireAdminCsrf(request);
  if (csrfError) return csrfError;

  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const rateError = applyRateLimitResponse(auth.user.id);
  if (rateError) return rateError;

  const { data: before } = await adminClient
    .from('admin_review_requests')
    .select('id, upload_id, status, reviewed_by')
    .eq('id', params.requestId)
    .maybeSingle();

  const result = await takeoverReviewLock(params.requestId, auth.user.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code || 'TAKEOVER_FAILED', message: result.message } },
      { status: result.code === 'NOT_FOUND' ? 404 : 409 }
    );
  }

  if (before) {
    try {
      await createReviewAction({
        verificationId: before.upload_id,
        reviewRequestId: before.id,
        actorUserId: auth.user.id,
        actorRole: 'admin',
        actionType: 'review_takeover',
        fromStatus: before.status,
        toStatus: 'reviewing',
        notes: result.previousHolder ? `Took over from ${await getReviewerDisplayName(result.previousHolder)}` : null,
      });
    } catch (error) {
      console.error('Takeover audit error:', error);
    }
  }

  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
