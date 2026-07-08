import { NextRequest, NextResponse } from 'next/server';
import { requireVerificationReviewer } from '@/lib/grades/admin';
import { refreshReviewLock } from '@/lib/grades/admin-lock';
import { applyRateLimitResponse, requireAdminCsrf } from '@/lib/api/admin-guard';

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

  const result = await refreshReviewLock(params.requestId, auth.user.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: result.code === 'NOT_FOUND' ? 404 : 409 }
    );
  }

  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
