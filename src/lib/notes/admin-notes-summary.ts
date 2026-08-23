import { adminClient } from '@/lib/supabase/admin';
import type { VerificationAnalyticsData } from '@/components/admin/verification-analytics-charts';
import {
  createDailyTrendBuckets,
  createMonthlyTrendBuckets,
  monthKey,
} from '@/lib/admin/analytics-time-buckets';
import { formatDurationMinutes, type SummaryDateRange } from '@/lib/grades/summary-date-range';
import { noteRejectReasonLabel } from '@/lib/notes/reject-reasons';

type NoteListingRow = {
  id: string;
  status: 'pending_review' | 'published' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  published_at: string | null;
  reviewed_by: string | null;
  reject_reason: string | null;
};

const CHART_STATUS_COLORS: Record<string, string> = {
  approved: '#22c55e',
  rejected: '#ef4444',
  pending: '#f59e0b',
  reviewing: '#8b5cf6',
  escalated: '#b91c1c',
};

const CHART_STATUS_LABELS: Record<string, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
  reviewing: 'In Review',
  escalated: 'Escalated',
};

function applyCreatedRange<T extends { gte: (col: string, val: string) => T; lte: (col: string, val: string) => T }>(
  query: T,
  range: SummaryDateRange,
  column = 'created_at'
) {
  if (range.from) query = query.gte(column, range.from);
  return query.lte(column, range.to);
}

function mapNoteStatusToChart(status: NoteListingRow['status']) {
  if (status === 'published') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

function resolvedAt(row: NoteListingRow) {
  return row.reviewed_at || row.published_at;
}

function applyNoteTrendRow(
  listing: NoteListingRow,
  monthBuckets: ReturnType<typeof createMonthlyTrendBuckets>,
  dayBuckets: ReturnType<typeof createDailyTrendBuckets>
) {
  const chartStatus = mapNoteStatusToChart(listing.status);
  const createdDayKey = new Date(listing.created_at).toISOString().slice(0, 10);
  const createdMonthKey = monthKey(new Date(listing.created_at));
  const monthBucket = monthBuckets.get(createdMonthKey);
  const dayBucket = dayBuckets.get(createdDayKey);
  if (monthBucket && dayBucket && chartStatus === 'pending') {
    monthBucket.pending += 1;
    dayBucket.pending += 1;
  }

  const resolved = resolvedAt(listing);
  if (resolved && (listing.status === 'published' || listing.status === 'rejected')) {
    const resolvedDayKey = new Date(resolved).toISOString().slice(0, 10);
    const resolvedMonthKey = monthKey(new Date(resolved));
    const resolvedMonthBucket = monthBuckets.get(resolvedMonthKey);
    const resolvedDayBucket = dayBuckets.get(resolvedDayKey);
    if (resolvedMonthBucket && resolvedDayBucket) {
      if (listing.status === 'published') {
        resolvedMonthBucket.approved += 1;
        resolvedDayBucket.approved += 1;
      }
      if (listing.status === 'rejected') {
        resolvedMonthBucket.rejected += 1;
        resolvedDayBucket.rejected += 1;
      }
    }
  }
}

async function fetchNoteVerificationAnalytics(range: SummaryDateRange) {
  const now = new Date();
  const rangeEnd = range.to ? new Date(range.to) : now;
  const rangeStart = range.from
    ? new Date(range.from)
    : (() => {
        const sixMonthsAgo = new Date(rangeEnd);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);
        return sixMonthsAgo;
      })();

  const sixMonthsAgo = new Date(rangeStart);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(rangeEnd);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  let statusQuery = adminClient
    .from('note_listings')
    .select('status, created_at, reviewed_at, published_at');
  if (range.from) statusQuery = statusQuery.gte('created_at', range.from);
  statusQuery = statusQuery.lte('created_at', range.to);

  const [statusResult, trendResult, weeklyResult] = await Promise.all([
    statusQuery,
    adminClient
      .from('note_listings')
      .select('status, created_at, reviewed_at, published_at')
      .gte('created_at', sixMonthsAgo.toISOString())
      .lte('created_at', range.to),
    adminClient
      .from('note_listings')
      .select('status, created_at, reviewed_at, published_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .lte('created_at', range.to),
  ]);

  if (statusResult.error) {
    return { ok: false as const, error: statusResult.error };
  }

  const statusCounts: Record<string, number> = {};
  for (const row of statusResult.data || []) {
    const chartStatus = mapNoteStatusToChart(row.status as NoteListingRow['status']);
    statusCounts[chartStatus] = (statusCounts[chartStatus] || 0) + 1;
  }

  const statusDistribution = Object.entries(statusCounts)
    .map(([status, value]) => ({
      name: CHART_STATUS_LABELS[status] || status.replace(/_/g, ' '),
      status,
      value,
      color: CHART_STATUS_COLORS[status] || '#64748b',
    }))
    .sort((a, b) => b.value - a.value);

  const monthBuckets = createMonthlyTrendBuckets(sixMonthsAgo);
  const dayBuckets = createDailyTrendBuckets(sixMonthsAgo, rangeEnd);

  for (const row of trendResult.data || []) {
    applyNoteTrendRow(row as NoteListingRow, monthBuckets, dayBuckets);
  }

  const weeklyBuckets = new Map<
    string,
    { day: string; submissions: number; resolved: number; approved: number; rejected: number }
  >();
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    weeklyBuckets.set(key, {
      day: date.toLocaleString('en-US', { weekday: 'short' }),
      submissions: 0,
      resolved: 0,
      approved: 0,
      rejected: 0,
    });
  }

  for (const row of weeklyResult.data || []) {
    const listing = row as NoteListingRow;
    const createdKey = new Date(listing.created_at).toISOString().slice(0, 10);
    const createdBucket = weeklyBuckets.get(createdKey);
    if (createdBucket) createdBucket.submissions += 1;

    const resolved = resolvedAt(listing);
    if (resolved) {
      const resolvedKey = new Date(resolved).toISOString().slice(0, 10);
      const resolvedBucket = weeklyBuckets.get(resolvedKey);
      if (resolvedBucket) {
        resolvedBucket.resolved += 1;
        if (listing.status === 'published') resolvedBucket.approved += 1;
        if (listing.status === 'rejected') resolvedBucket.rejected += 1;
      }
    }
  }

  const analytics: VerificationAnalyticsData = {
    statusDistribution,
    monthlyData: Array.from(monthBuckets.values()),
    dailyData: Array.from(dayBuckets.values()),
    weeklyData: Array.from(weeklyBuckets.values()),
    summary: {
      approved: statusCounts.approved || 0,
      rejected: statusCounts.rejected || 0,
      reviewing: 0,
      waiting: statusCounts.pending || 0,
      escalated: 0,
    },
  };

  return { ok: true as const, analytics };
}

export async function fetchNoteVerificationSummaryReport(range: SummaryDateRange) {
  let createdQuery = adminClient
    .from('note_listings')
    .select('id, status, created_at, reviewed_at, published_at, reviewed_by, reject_reason');
  createdQuery = applyCreatedRange(createdQuery, range);

  const { data: listings, error } = await createdQuery;
  if (error) {
    if (error.message.includes('relation "public.note_listings" does not exist')) {
      return { ok: false as const, missingMigration: '016_note_listings.sql', error };
    }
    return { ok: false as const, error };
  }

  const rows = (listings || []) as NoteListingRow[];
  const statusCounts: Record<string, number> = {};
  for (const row of rows) {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
  }

  const resolvedInRange = rows.filter((row) => {
    const resolved = resolvedAt(row);
    return (
      resolved &&
      resolved >= (range.from || '1970-01-01') &&
      resolved <= range.to &&
      (row.status === 'published' || row.status === 'rejected')
    );
  });

  const approvedInRange = resolvedInRange.filter((row) => row.status === 'published').length;
  const rejectedInRange = resolvedInRange.filter((row) => row.status === 'rejected').length;
  const totalVerifications = rows.length;
  const finalizedInRange = approvedInRange + rejectedInRange;
  const approvalRate = finalizedInRange > 0 ? Math.round((approvedInRange / finalizedInRange) * 100) : 0;
  const rejectionRate = finalizedInRange > 0 ? Math.round((rejectedInRange / finalizedInRange) * 100) : 0;

  const reviewDurations = resolvedInRange
    .map((row) => {
      const resolved = resolvedAt(row);
      if (!resolved) return null;
      const start = new Date(row.created_at).getTime();
      const end = new Date(resolved).getTime();
      return Math.max(0, (end - start) / (1000 * 60));
    })
    .filter((value): value is number => value !== null);

  const averageReviewTimeMinutes =
    reviewDurations.length > 0
      ? reviewDurations.reduce((sum, value) => sum + value, 0) / reviewDurations.length
      : 0;

  const rejectReasonCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== 'rejected' || !row.reject_reason) continue;
    rejectReasonCounts.set(row.reject_reason, (rejectReasonCounts.get(row.reject_reason) || 0) + 1);
  }
  const totalRejectReasons = Array.from(rejectReasonCounts.values()).reduce((sum, value) => sum + value, 0);

  const reviewerMap = new Map<
    string,
    { name: string; casesReviewed: number; approvals: number; rejections: number; durations: number[] }
  >();

  const reviewerIds = Array.from(
    new Set(resolvedInRange.map((row) => row.reviewed_by).filter(Boolean) as string[])
  );

  if (reviewerIds.length > 0) {
    const { data: reviewers } = await adminClient
      .from('users')
      .select('id, full_name, email')
      .in('id', reviewerIds);

    const usersById = new Map(
      (reviewers || []).map((user) => [user.id, user.full_name || user.email || 'Unknown'])
    );

    for (const row of resolvedInRange) {
      if (!row.reviewed_by) continue;
      const current = reviewerMap.get(row.reviewed_by) || {
        name: usersById.get(row.reviewed_by) || 'Unknown',
        casesReviewed: 0,
        approvals: 0,
        rejections: 0,
        durations: [] as number[],
      };
      current.casesReviewed += 1;
      if (row.status === 'published') current.approvals += 1;
      if (row.status === 'rejected') current.rejections += 1;
      const resolved = resolvedAt(row);
      if (resolved) {
        const minutes = Math.max(
          0,
          (new Date(resolved).getTime() - new Date(row.created_at).getTime()) / (1000 * 60)
        );
        current.durations.push(minutes);
      }
      reviewerMap.set(row.reviewed_by, current);
    }
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
      averageReviewTimeLabel:
        value.durations.length > 0
          ? formatDurationMinutes(value.durations.reduce((sum, entry) => sum + entry, 0) / value.durations.length)
          : '—',
    }))
    .sort((a, b) => b.casesReviewed - a.casesReviewed)
    .slice(0, 5);

  const analyticsResult = await fetchNoteVerificationAnalytics(range);

  const cards = {
    totalVerifications,
    approved: approvedInRange,
    rejected: rejectedInRange,
    pending: statusCounts.pending_review || 0,
    inReview: 0,
    waitingStudent: 0,
    escalated: 0,
    approvalRate,
    rejectionRate,
    averageReviewTimeLabel: formatDurationMinutes(averageReviewTimeMinutes),
    autoApproved: 0,
    manualReviews: finalizedInRange,
  };

  const pipeline = {
    uploaded: totalVerifications,
    aiParsed: totalVerifications,
    autoApproved: 0,
    manualReview: finalizedInRange,
    approved: approvedInRange,
    rejected: rejectedInRange,
  };

  const riskDistribution = Array.from(rejectReasonCounts.entries()).map(([level, value]) => ({
    level,
    label: noteRejectReasonLabel(level),
    value,
    percentage: totalRejectReasons > 0 ? Math.round((value / totalRejectReasons) * 100) : 0,
  }));

  const queueTrend = [
    { status: 'pending', label: 'Pending', value: statusCounts.pending_review || 0 },
    { status: 'reviewing', label: 'In Review', value: 0 },
    { status: 'waiting_student', label: 'Waiting Student', value: 0 },
    { status: 'escalated', label: 'Escalated', value: 0 },
  ];

  const processingTime = {
    autoApproval: '—',
    manualReview: formatDurationMinutes(averageReviewTimeMinutes),
    waitingStudent: '—',
    escalated: '—',
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
