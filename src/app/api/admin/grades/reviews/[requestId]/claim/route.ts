import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { claimAdminReviewRequest } from '@/lib/grades/admin-review';
import { createReviewAction } from '@/lib/grades/review-pipeline';
import { applyRateLimitResponse, requireAdminCsrf } from '@/lib/api/admin-guard';

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

  const claimResult = await claimAdminReviewRequest(params.requestId, auth.user.id);
  if (!claimResult.ok) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: claimResult.message } }, { status: 404 });
  }

  if (claimResult.claimed) {
    try {
      await createReviewAction({
        verificationId: claimResult.request.upload_id,
        reviewRequestId: claimResult.request.id,
        actorUserId: auth.user.id,
        actorRole: 'admin',
        actionType: 'review_claimed',
        fromStatus: 'pending',
        toStatus: 'reviewing',
      });
    } catch (error) {
      console.error('Claim audit error:', error);
    }
  }

  return NextResponse.json(
    {
      data: {
        claimed: claimResult.claimed,
        readOnly: claimResult.readOnly,
        reviewerName: 'reviewerName' in claimResult ? claimResult.reviewerName : null,
      },
    },
    { status: 200 }
  );
}
