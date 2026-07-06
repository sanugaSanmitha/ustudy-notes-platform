import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { fetchAdminReviewStats } from '@/lib/grades/admin-review';
import { fetchQueueSummary, fetchRecentReviewActions } from '@/lib/grades/admin-audit';
import { fetchSupportQueueStats, fetchSupportQueueSummary } from '@/lib/grades/support-queue';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const [stats, summaryResult, actionsResult, supportStats, supportSummaryResult] = await Promise.all([
    fetchAdminReviewStats(),
    fetchQueueSummary(5),
    fetchRecentReviewActions(20),
    fetchSupportQueueStats(),
    fetchSupportQueueSummary(5),
  ]);

  return NextResponse.json(
    {
      data: {
        stats,
        queueSummary: summaryResult.ok ? summaryResult.requests : [],
        recentActions: actionsResult.ok ? actionsResult.actions : [],
        supportStats,
        supportQueueSummary: supportSummaryResult.ok ? supportSummaryResult.items : [],
      },
    },
    { status: 200 }
  );
}
