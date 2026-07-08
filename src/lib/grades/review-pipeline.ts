import { adminClient } from '@/lib/supabase/admin';

export type QueueTier = 'fast' | 'normal' | 'manual_fallback';
export type QueueStatus =
  | 'pending'
  | 'queued_support_fast'
  | 'queued_support_normal'
  | 'queued_manual_fallback'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'reupload_required'
  | 'auto_approved';

export function toPercentageScore(confidence: number) {
  if (!Number.isFinite(confidence)) return 0;
  const normalized = Math.max(0, Math.min(1, confidence));
  return Math.round(normalized * 100);
}

export function resolveQueueTier(confidenceScore: number, manualFallback: boolean): QueueTier {
  if (manualFallback || confidenceScore < 60) {
    return 'manual_fallback';
  }

  if (confidenceScore >= 85) {
    return 'fast';
  }

  return 'normal';
}

export function resolveQueueStatus(options: {
  verificationStatus: 'manual_required' | 'pending_review' | 'approved' | 'rejected';
  queueTier: QueueTier;
}) {
  if (options.verificationStatus === 'approved') {
    return 'auto_approved' as QueueStatus;
  }

  if (options.verificationStatus === 'rejected') {
    return 'rejected' as QueueStatus;
  }

  if (options.queueTier === 'manual_fallback') {
    return 'queued_manual_fallback' as QueueStatus;
  }

  if (options.queueTier === 'fast') {
    return 'queued_support_fast' as QueueStatus;
  }

  return 'queued_support_normal' as QueueStatus;
}

export async function upsertParseQueue(params: {
  verificationId: string;
  userId: string;
  verificationStatus: 'manual_required' | 'pending_review' | 'approved' | 'rejected';
  extractionConfidence: number;
  aiResultJson: unknown;
  parserSource: string | null;
  failureReason?: string | null;
}) {
  const confidenceScore = toPercentageScore(params.extractionConfidence);
  const queueTier = resolveQueueTier(confidenceScore, params.verificationStatus === 'manual_required');
  const status = resolveQueueStatus({ verificationStatus: params.verificationStatus, queueTier });

  const { error } = await adminClient.from('grade_parse_queue').upsert(
    {
      verification_id: params.verificationId,
      user_id: params.userId,
      status,
      queue_tier: queueTier,
      confidence_score: confidenceScore,
      ai_result_json: params.aiResultJson,
      parser_source: params.parserSource,
      failure_reason: params.failureReason || null,
      reviewed_at: status === 'auto_approved' || status === 'approved' || status === 'rejected' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'verification_id' }
  );

  if (error) {
    throw error;
  }
}

export async function createReviewAction(params: {
  verificationId?: string | null;
  queueId?: string | null;
  reviewRequestId?: string | null;
  actorUserId?: string | null;
  actorRole: 'support' | 'admin' | 'assistant' | 'system';
  actionType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  notes?: string | null;
  beforePayload?: unknown;
  afterPayload?: unknown;
}) {
  const { error } = await adminClient.from('review_actions').insert({
    verification_id: params.verificationId || null,
    queue_id: params.queueId || null,
    review_request_id: params.reviewRequestId || null,
    actor_user_id: params.actorUserId || null,
    actor_role: params.actorRole,
    action_type: params.actionType,
    from_status: params.fromStatus || null,
    to_status: params.toStatus || null,
    notes: params.notes || null,
    before_payload: params.beforePayload ?? null,
    after_payload: params.afterPayload ?? null,
  });

  if (error) {
    throw error;
  }
}
