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
