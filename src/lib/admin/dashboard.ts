import { fetchAdminReviewStats } from '@/lib/grades/admin-review';
import { fetchQueueSummary, fetchRecentReviewActions } from '@/lib/grades/admin-audit';
import { fetchTodayActivity } from '@/lib/grades/admin-summary';

export type AdminDashboardData = {
  queue: {
    waitingAssignment: number;
    pending: number;
    inReview: number;
    waitingStudent: number;
    pendingReassignment: number;
    escalated: number;
  };
  todayActivity: {
    approvedToday: number;
    rejectedToday: number;
    assignedToday: number;
    completedToday: number;
    averageReviewTimeLabel: string;
  };
  queueSummary: Array<Record<string, unknown>>;
  recentActions: Array<Record<string, unknown>>;
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [stats, summaryResult, actionsResult] = await Promise.all([
    fetchAdminReviewStats(),
    fetchQueueSummary(5),
    fetchRecentReviewActions(20),
  ]);

  const todayActivity = await fetchTodayActivity({
    approvedToday: stats.approvedToday,
    rejectedToday: stats.rejectedToday,
  });

  return {
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
  };
}
