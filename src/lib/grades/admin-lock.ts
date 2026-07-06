import { adminClient } from '@/lib/supabase/admin';

/** Lock TTL — 5 minutes since last heartbeat (Part 3 §3 / Part 5 §4.2). */
export const LOCK_TTL_MS = 5 * 60 * 1000;

export function isLockExpired(updatedAt: string | null | undefined) {
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() > LOCK_TTL_MS;
}

export async function expireStaleReviewLocks() {
  const cutoff = new Date(Date.now() - LOCK_TTL_MS).toISOString();
  const { data, error } = await adminClient
    .from('admin_review_requests')
    .update({
      status: 'pending',
      reviewed_by: null,
      review_started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'reviewing')
    .lt('updated_at', cutoff)
    .select('id');

  if (error && !`${error.message}`.toLowerCase().includes('reviewed_by')) {
    console.error('Expire stale locks error:', error);
  }

  return data?.length || 0;
}

export async function refreshReviewLock(requestId: string, adminId: string) {
  await expireStaleReviewLocks();

  const { data: row, error } = await adminClient
    .from('admin_review_requests')
    .select('id, status, reviewed_by, updated_at')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Review request not found.' };
  }

  if (row.status !== 'reviewing' || row.reviewed_by !== adminId) {
    return { ok: false as const, code: 'LOCK_LOST' as const, message: 'You no longer hold the lock on this request.' };
  }

  const now = new Date().toISOString();
  await adminClient.from('admin_review_requests').update({ updated_at: now }).eq('id', requestId);

  return { ok: true as const };
}

export async function releaseReviewLock(requestId: string, adminId: string) {
  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from('admin_review_requests')
    .update({
      status: 'pending',
      reviewed_by: null,
      review_started_at: null,
      updated_at: now,
    })
    .eq('id', requestId)
    .eq('status', 'reviewing')
    .eq('reviewed_by', adminId)
    .select('id')
    .maybeSingle();

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const, released: Boolean(data) };
}

export async function takeoverReviewLock(requestId: string, adminId: string) {
  await expireStaleReviewLocks();

  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from('admin_review_requests')
    .update({
      status: 'reviewing',
      reviewed_by: adminId,
      review_started_at: now,
      updated_at: now,
    })
    .eq('id', requestId)
    .in('status', ['pending', 'reviewing'])
    .select('id, reviewed_by')
    .maybeSingle();

  if (error) {
    return { ok: false as const, message: error.message };
  }

  if (!data) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Request not found or already finalized.' };
  }

  return { ok: true as const, previousHolder: data.reviewed_by !== adminId ? data.reviewed_by : null };
}
