import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { fetchAdminReviewStats } from '@/lib/grades/admin-review';
import { fetchQueueSummary, fetchRecentReviewActions } from '@/lib/grades/admin-audit';
import { fetchTodayActivity } from '@/lib/grades/admin-summary';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const [stats, summaryResult, actionsResult, todayActivity] = await Promise.all([
    fetchAdminReviewStats(),
    fetchQueueSummary(5),
    fetchRecentReviewActions(20),
    fetchTodayActivity(),
  ]);

  return NextResponse.json(
    {
      data: {
        queue: {
          waitingAssignment: stats.waitingAssignment ?? 0,
          pending: stats.pending,
          inReview: stats.reviewing,
          waitingStudent: stats.waitingStudent ?? 0,
          pendingReassignment: stats.pendingReassignment ?? 0,
          escalated: stats.escalated ?? 0,
        },
        todayActivity,
        queueSummary: summaryResult.ok ? summaryResult.requests : [],
        recentActions: actionsResult.ok ? actionsResult.actions : [],
      },
    },
    { status: 200 }
  );
}
