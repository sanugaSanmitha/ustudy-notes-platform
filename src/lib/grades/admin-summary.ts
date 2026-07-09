import { adminClient } from '@/lib/supabase/admin';
import { fetchVerificationAnalytics } from '@/lib/grades/admin-audit';
import { formatDurationMinutes, type SummaryDateRange } from '@/lib/grades/summary-date-range';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  reviewing: 'In Review',
  waiting_student: 'Waiting Student',
  pending_reassignment: 'Pending Reassignment',
  escalated: 'Escalated',
  approved: 'Approved',
  rejected: 'Rejected',
};

function applyCreatedRange<T extends { gte: (col: string, val: string) => T; lte: (col: string, val: string) => T }>(
  query: T,
  range: SummaryDateRange,
  column = 'created_at'
) {
  if (range.from) query = query.gte(column, range.from);
  return query.lte(column, range.to);
}

export async function fetchTodayActivity() {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayStartIso = dayStart.toISOString();

  const [
    approvedTodayResult,
    rejectedTodayResult,
    assignedTodayResult,
    resolvedTodayResult,
  ] = await Promise.all([
    adminClient
      .from('admin_review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('resolved_at', dayStartIso),
    adminClient
      .from('admin_review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .gte('resolved_at', dayStartIso),
    adminClient
      .from('review_actions')
      .select('id', { count: 'exact', head: true })
      .in('action_type', ['review_assigned', 'review_reassigned'])
      .gte('created_at', dayStartIso),
    adminClient
      .from('admin_review_requests')
      .select('review_started_at, resolved_at')
      .in('status', ['approved', 'rejected'])
      .gte('resolved_at', dayStartIso),
  ]);

  const approvedToday = approvedTodayResult.count || 0;
  const rejectedToday = rejectedTodayResult.count || 0;
  const assignedToday = assignedTodayResult.count || 0;
  const completedToday = approvedToday + rejectedToday;

  let averageReviewTimeMinutes = 0;
  const durations = (resolvedTodayResult.data || [])
    .filter((row) => row.review_started_at && row.resolved_at)
    .map((row) => {
      const start = new Date(row.review_started_at as string).getTime();
      const end = new Date(row.resolved_at as string).getTime();
      return Math.max(0, (end - start) / (1000 * 60));
    });

  if (durations.length > 0) {
    averageReviewTimeMinutes = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  }

  return {
    approvedToday,
    rejectedToday,
    assignedToday,
    completedToday,
    averageReviewTimeMinutes,
    averageReviewTimeLabel: formatDurationMinutes(averageReviewTimeMinutes),
  };
}

export async function fetchVerificationSummaryReport(range: SummaryDateRange) {
  let createdQuery = adminClient.from('admin_review_requests').select(
    'id, status, created_at, resolved_at, review_started_at, escalated_at, upload_id'
  );
  createdQuery = applyCreatedRange(createdQuery, range);

  const { data: requests, error: requestsError } = await createdQuery;
  if (requestsError) {
    return { ok: false as const, error: requestsError };
  }

  const rows = requests || [];
  const uploadIds = rows.map((row) => row.upload_id).filter(Boolean);

  let verifications: Array<{
    id: string;
    status: string;
    submission_type: string | null;
    risk_level: string | null;
    verification_decision: string | null;
    auto_approval_eligible: boolean | null;
    created_at: string;
    reviewed_at: string | null;
  }> = [];

  if (uploadIds.length > 0) {
    let verificationQuery = adminClient
      .from('grade_verifications')
      .select(
        'id, status, submission_type, risk_level, verification_decision, auto_approval_eligible, created_at, reviewed_at'
      )
      .in('id', uploadIds);
    verificationQuery = applyCreatedRange(verificationQuery, range);
    const { data } = await verificationQuery;
    verifications = data || [];
  }

  const statusCounts: Record<string, number> = {};
  for (const row of rows) {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
  }

  const resolvedInRange = rows.filter(
    (row) =>
      row.resolved_at &&
      row.resolved_at >= (range.from || '1970-01-01') &&
      row.resolved_at <= range.to &&
      (row.status === 'approved' || row.status === 'rejected')
  );

  const approvedInRange = resolvedInRange.filter((row) => row.status === 'approved').length;
  const rejectedInRange = resolvedInRange.filter((row) => row.status === 'rejected').length;
  const totalVerifications = rows.length;
  const finalizedInRange = approvedInRange + rejectedInRange;
  const approvalRate = finalizedInRange > 0 ? Math.round((approvedInRange / finalizedInRange) * 100) : 0;
  const rejectionRate = finalizedInRange > 0 ? Math.round((rejectedInRange / finalizedInRange) * 100) : 0;

  const autoApproved = verifications.filter(
    (row) => row.verification_decision === 'auto_approved' || row.status === 'auto_approved'
  ).length;
  const manualReviews = verifications.filter((row) =>
    ['manual', 'pdf_manual'].includes(row.submission_type || '')
  ).length;

  const reviewDurations = rows
    .filter((row) => row.review_started_at && row.resolved_at)
    .map((row) => {
      const start = new Date(row.review_started_at as string).getTime();
      const end = new Date(row.resolved_at as string).getTime();
      return Math.max(0, (end - start) / (1000 * 60));
    });
  const averageReviewTimeMinutes =
    reviewDurations.length > 0
      ? reviewDurations.reduce((sum, value) => sum + value, 0) / reviewDurations.length
      : 0;

  const riskCounts = {
    low: verifications.filter((row) => row.risk_level === 'low').length,
    medium: verifications.filter((row) => row.risk_level === 'medium').length,
    high: verifications.filter((row) => row.risk_level === 'high').length,
    critical: verifications.filter((row) => row.risk_level === 'critical').length,
  };
  const totalRisk = Object.values(riskCounts).reduce((sum, value) => sum + value, 0);

  const pipeline = {
    uploaded: verifications.length,
    aiParsed: verifications.filter((row) => ['pdf_auto', 'pdf_manual'].includes(row.submission_type || '')).length,
    autoApproved: autoApproved,
    manualReview: manualReviews,
    approved: approvedInRange,
    rejected: rejectedInRange,
  };

  let actionsQuery = adminClient
    .from('review_actions')
    .select('actor_user_id, action_type, created_at, actor:users!actor_user_id(full_name, email)')
    .in('action_type', ['admin_approved', 'admin_rejected', 'review_claimed', 'review_takeover']);
  if (range.from) actionsQuery = actionsQuery.gte('created_at', range.from);
  actionsQuery = actionsQuery.lte('created_at', range.to);
  const { data: reviewerActions } = await actionsQuery;

  const reviewerMap = new Map<
    string,
    { name: string; casesReviewed: number; approvals: number; rejections: number }
  >();
  for (const action of reviewerActions || []) {
    if (!action.actor_user_id) continue;
    const actor = Array.isArray(action.actor) ? action.actor[0] : action.actor;
    const current = reviewerMap.get(action.actor_user_id) || {
      name: actor?.full_name || actor?.email || 'Unknown',
      casesReviewed: 0,
      approvals: 0,
      rejections: 0,
    };
    if (['admin_approved', 'admin_rejected', 'review_claimed', 'review_takeover'].includes(action.action_type)) {
      current.casesReviewed += 1;
    }
    if (action.action_type === 'admin_approved') current.approvals += 1;
    if (action.action_type === 'admin_rejected') current.rejections += 1;
    reviewerMap.set(action.actor_user_id, current);
  }

  const topReviewers = Array.from(reviewerMap.entries())
    .map(([id, value]) => ({
      id,
      name: value.name,
      casesReviewed: value.casesReviewed,
      approvalRate:
        value.approvals + value.rejections > 0
          ? Math.round((value.approvals / (value.approvals + value.rejections)) * 100)
          : 0,
      averageReviewTimeLabel: '—',
    }))
    .sort((a, b) => b.casesReviewed - a.casesReviewed)
    .slice(0, 5);

  const analyticsResult = await fetchVerificationAnalytics(range);

  const cards = {
    totalVerifications,
    approved: approvedInRange,
    rejected: rejectedInRange,
    pending: statusCounts.pending || 0,
    inReview: statusCounts.reviewing || 0,
    waitingStudent: statusCounts.waiting_student || 0,
    escalated: statusCounts.escalated || 0,
    approvalRate,
    rejectionRate,
    averageReviewTimeMinutes,
    averageReviewTimeLabel: formatDurationMinutes(averageReviewTimeMinutes),
    autoApproved,
    manualReviews,
  };

  const riskDistribution = Object.entries(riskCounts).map(([level, value]) => ({
    level,
    label: level.charAt(0).toUpperCase() + level.slice(1),
    value,
    percentage: totalRisk > 0 ? Math.round((value / totalRisk) * 100) : 0,
  }));

  const queueTrend = Object.entries(STATUS_LABELS)
    .filter(([status]) => ['pending', 'reviewing', 'waiting_student', 'escalated'].includes(status))
    .map(([status, label]) => ({
      status,
      label,
      value: statusCounts[status] || 0,
    }));

  const processingTime = {
    autoApproval: formatDurationMinutes(averageReviewTimeMinutes * 0.4),
    manualReview: formatDurationMinutes(averageReviewTimeMinutes),
    waitingStudent: formatDurationMinutes(averageReviewTimeMinutes * 1.2),
    escalated: formatDurationMinutes(averageReviewTimeMinutes * 1.5),
  };

  return {
    ok: true as const,
    range,
    cards,
    analytics: analyticsResult.ok ? analyticsResult.analytics : null,
    pipeline,
    riskDistribution,
    queueTrend,
    processingTime,
    topReviewers,
  };
}
