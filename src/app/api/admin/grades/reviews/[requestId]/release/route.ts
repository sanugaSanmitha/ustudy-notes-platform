import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { releaseReviewLock } from '@/lib/grades/admin-lock';
import { createReviewAction } from '@/lib/grades/review-pipeline';
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
    .select('id, upload_id, status')
    .eq('id', params.requestId)
    .maybeSingle();

  const result = await releaseReviewLock(params.requestId, auth.user.id);

  if (result.released && before) {
    try {
      await createReviewAction({
        verificationId: before.upload_id,
        reviewRequestId: before.id,
        actorUserId: auth.user.id,
        actorRole: 'admin',
        actionType: 'lock_released',
        fromStatus: before.status,
        toStatus: 'pending',
      });
    } catch (error) {
      console.error('Lock release audit error:', error);
    }
  }

  return NextResponse.json({ data: { released: result.released } }, { status: 200 });
}
