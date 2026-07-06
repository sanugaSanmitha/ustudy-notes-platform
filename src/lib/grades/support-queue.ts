import { adminClient } from '@/lib/supabase/admin';

export const OPEN_SUPPORT_STATUSES = [
  'queued_support_fast',
  'queued_support_normal',
  'queued_manual_fallback',
  'pending',
] as const;

export type SupportQueueStats = {
  open: number;
  underReview: number;
  fastQueue: number;
  manualFallback: number;
};

const SUMMARY_SELECT =
  'id, status, queue_tier, created_at, failure_reason, student:users!user_id(full_name, email), assignee:users!assigned_to(full_name, email)';

export async function fetchSupportQueueStats(): Promise<SupportQueueStats> {
  const { data, error } = await adminClient.from('grade_parse_queue').select('status');

  if (error || !data) {
    return { open: 0, underReview: 0, fastQueue: 0, manualFallback: 0 };
  }

  return data.reduce<SupportQueueStats>(
    (acc, row) => {
      const status = row.status as string;
      if (OPEN_SUPPORT_STATUSES.includes(status as (typeof OPEN_SUPPORT_STATUSES)[number])) {
        acc.open += 1;
      }
      if (status === 'under_review') acc.underReview += 1;
      if (status === 'queued_support_fast') acc.fastQueue += 1;
      if (status === 'queued_manual_fallback') acc.manualFallback += 1;
      return acc;
    },
    { open: 0, underReview: 0, fastQueue: 0, manualFallback: 0 }
  );
}

export async function fetchSupportQueueSummary(limit = 5) {
  const { data, error } = await adminClient
    .from('grade_parse_queue')
    .select(SUMMARY_SELECT)
    .in('status', [...OPEN_SUPPORT_STATUSES, 'under_review'])
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    return { ok: false as const, error };
  }

  return { ok: true as const, items: data || [] };
}
