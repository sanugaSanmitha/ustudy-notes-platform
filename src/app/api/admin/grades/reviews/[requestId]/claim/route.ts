import { NextRequest, NextResponse } from 'next/server';
import { requireVerificationReviewer } from '@/lib/grades/admin';
import { claimAdminReviewRequest } from '@/lib/grades/admin-review';
import { createReviewAction } from '@/lib/grades/review-pipeline';
import { applyRateLimitResponse, requireAdminCsrf } from '@/lib/api/admin-guard';
import { resolveReviewActorRole } from '@/lib/grades/verification-workflow';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { requestId: string } }) {
  const csrfError = requireAdminCsrf(request);
  if (csrfError) return csrfError;

  const auth = await requireVerificationReviewer();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const rateError = applyRateLimitResponse(auth.user.id);
  if (rateError) return rateError;

  const claimResult = await claimAdminReviewRequest(params.requestId, auth.user.id, { isAdmin: auth.isAdmin });
  if (!claimResult.ok) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: claimResult.message } }, { status: 404 });
  }

  if (claimResult.claimed) {
    try {
      await createReviewAction({
        verificationId: claimResult.request.upload_id,
        reviewRequestId: claimResult.request.id,
        actorUserId: auth.user.id,
        actorRole: resolveReviewActorRole({ isAdmin: auth.isAdmin, isAssistant: auth.isAssistant }),
        actionType: 'review_claimed',
        fromStatus: 'pending',
        toStatus: 'reviewing',
        afterPayload: { assignedBy: 'self_claim' },
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
        code: 'code' in claimResult ? claimResult.code : null,
      },
    },
    { status: claimResult.claimed ? 200 : 'code' in claimResult && claimResult.code === 'ALREADY_CLAIMED' ? 409 : 200 }
  );
}
