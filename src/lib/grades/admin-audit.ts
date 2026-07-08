import { adminClient } from '@/lib/supabase/admin';

export async function fetchRecentReviewActions(limit = 20) {
  const { data, error } = await adminClient
    .from('review_actions')
    .select(
      'id, action_type, from_status, to_status, notes, created_at, actor_user_id, review_request_id, verification_id, actor:users!actor_user_id(full_name, email)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { ok: false as const, error };
  }

  return { ok: true as const, actions: data || [] };
}

export async function fetchAuditLogs(options: {
  page?: number;
  pageSize?: number;
  actionType?: string;
} = {}) {
  const { page = 1, pageSize = 25, actionType } = options;
  const from = (page - 1) * pageSize;

  let query = adminClient
    .from('review_actions')
    .select(
      'id, action_type, from_status, to_status, notes, before_payload, after_payload, created_at, actor_user_id, review_request_id, verification_id, actor:users!actor_user_id(full_name, email)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (actionType && actionType !== 'all') {
    query = query.eq('action_type', actionType);
  }

  const { data, error, count } = await query;

  if (error) {
    return { ok: false as const, error };
  }

  return {
    ok: true as const,
    logs: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
  };
}

const STATUS_CHART_COLORS: Record<string, string> = {
  approved: '#22c55e',
  rejected: '#ef4444',
  reviewing: '#8b5cf6',
  pending: '#f59e0b',
  waiting_student: '#fb923c',
  pending_reassignment: '#dc2626',
  escalated: '#b91c1c',
};

const STATUS_CHART_LABELS: Record<string, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  reviewing: 'In Review',
  pending: 'Waiting',
  waiting_student: 'Waiting Student',
  pending_reassignment: 'Pending Reassignment',
  escalated: 'Escalated',
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'short' });
}

export async function fetchVerificationAnalytics() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [statusResult, trendResult, weeklyResult] = await Promise.all([
    adminClient.from('admin_review_requests').select('status'),
    adminClient
      .from('admin_review_requests')
      .select('status, created_at, resolved_at')
      .gte('created_at', sixMonthsAgo.toISOString()),
    adminClient
      .from('admin_review_requests')
      .select('status, created_at, resolved_at')
      .gte('created_at', sevenDaysAgo.toISOString()),
  ]);

  if (statusResult.error) {
    return { ok: false as const, error: statusResult.error };
  }

  const statusCounts: Record<string, number> = {};
  for (const row of statusResult.data || []) {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
  }

  const statusDistribution = Object.entries(statusCounts)
    .map(([status, value]) => ({
      name: STATUS_CHART_LABELS[status] || status.replace(/_/g, ' '),
      status,
      value,
      color: STATUS_CHART_COLORS[status] || '#64748b',
    }))
    .sort((a, b) => b.value - a.value);

  const monthBuckets = new Map<string, { month: string; approved: number; rejected: number; pending: number }>();
  for (let i = 0; i < 6; i += 1) {
    const date = new Date(sixMonthsAgo);
    date.setMonth(sixMonthsAgo.getMonth() + i);
    const key = monthKey(date);
    monthBuckets.set(key, { month: monthLabel(key), approved: 0, rejected: 0, pending: 0 });
  }

  for (const row of trendResult.data || []) {
    const createdKey = monthKey(new Date(row.created_at));
    const bucket = monthBuckets.get(createdKey);
    if (bucket && !['approved', 'rejected'].includes(row.status)) {
      bucket.pending += 1;
    }
    if (row.resolved_at && (row.status === 'approved' || row.status === 'rejected')) {
      const resolvedKey = monthKey(new Date(row.resolved_at));
      const resolvedBucket = monthBuckets.get(resolvedKey);
      if (resolvedBucket) {
        if (row.status === 'approved') resolvedBucket.approved += 1;
        if (row.status === 'rejected') resolvedBucket.rejected += 1;
      }
    }
  }

  const weeklyBuckets = new Map<string, { day: string; submissions: number; resolved: number }>();
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    weeklyBuckets.set(key, {
      day: date.toLocaleString('en-US', { weekday: 'short' }),
      submissions: 0,
      resolved: 0,
    });
  }

  for (const row of weeklyResult.data || []) {
    const createdKey = new Date(row.created_at).toISOString().slice(0, 10);
    const createdBucket = weeklyBuckets.get(createdKey);
    if (createdBucket) createdBucket.submissions += 1;

    if (row.resolved_at) {
      const resolvedKey = new Date(row.resolved_at).toISOString().slice(0, 10);
      const resolvedBucket = weeklyBuckets.get(resolvedKey);
      if (resolvedBucket) resolvedBucket.resolved += 1;
    }
  }

  const summary = {
    approved: statusCounts.approved || 0,
    rejected: statusCounts.rejected || 0,
    reviewing: statusCounts.reviewing || 0,
    waiting:
      (statusCounts.pending || 0) +
      (statusCounts.waiting_student || 0) +
      (statusCounts.pending_reassignment || 0),
    escalated: statusCounts.escalated || 0,
  };

  return {
    ok: true as const,
    analytics: {
      statusDistribution,
      monthlyData: Array.from(monthBuckets.values()),
      weeklyData: Array.from(weeklyBuckets.values()),
      summary,
    },
  };
}

export async function fetchQueueSummary(limit = 5) {
  const { data, error } = await adminClient
    .from('admin_review_requests')
    .select(
      'id, status, created_at, user_id, reviewed_by, student:users!user_id(full_name, email), reviewer:users!reviewed_by(full_name, email)'
    )
    .in('status', ['pending', 'reviewing'])
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    return { ok: false as const, error };
  }

  return { ok: true as const, requests: data || [] };
}
