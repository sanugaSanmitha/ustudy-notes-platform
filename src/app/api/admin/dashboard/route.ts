import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { fetchAdminReviewStats } from '@/lib/grades/admin-review';
import { fetchQueueSummary, fetchRecentReviewActions, fetchVerificationAnalytics } from '@/lib/grades/admin-audit';
import { fetchSupportQueueStats, fetchSupportQueueSummary } from '@/lib/grades/support-queue';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const [stats, summaryResult, actionsResult, supportStats, supportSummaryResult, analyticsResult] = await Promise.all([
    fetchAdminReviewStats(),
    fetchQueueSummary(5),
    fetchRecentReviewActions(20),
    fetchSupportQueueStats(),
    fetchSupportQueueSummary(5),
    fetchVerificationAnalytics(),
  ]);

  return NextResponse.json(
    {
      data: {
        stats,
        queueSummary: summaryResult.ok ? summaryResult.requests : [],
        recentActions: actionsResult.ok ? actionsResult.actions : [],
        supportStats,
        supportQueueSummary: supportSummaryResult.ok ? supportSummaryResult.items : [],
        analytics: analyticsResult.ok ? analyticsResult.analytics : null,
      },
    },
    { status: 200 }
  );
}
