import { NextResponse } from 'next/server';
import { requireVerificationReviewer } from '@/lib/grades/admin';
import { fetchAdminReviewStats } from '@/lib/grades/admin-review';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireVerificationReviewer();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const stats = await fetchAdminReviewStats();

  return NextResponse.json({ data: { stats } }, { status: 200 });
}
