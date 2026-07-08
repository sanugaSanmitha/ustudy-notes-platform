import { isLockExpired } from '@/lib/grades/admin-lock';

export const VERIFICATION_PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;
export type VerificationPriority = (typeof VERIFICATION_PRIORITIES)[number];

export const VERIFICATION_STATUSES = [
  'pending',
  'reviewing',
  'waiting_student',
  'pending_reassignment',
  'escalated',
  'approved',
  'rejected',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const ACTIVE_VERIFICATION_STATUSES: VerificationStatus[] = [
  'pending',
  'reviewing',
  'waiting_student',
  'pending_reassignment',
  'escalated',
];

export const PRIORITY_SLA_HOURS: Record<VerificationPriority, number> = {
  urgent: 2,
  high: 4,
  normal: 8,
  low: 24,
};

export const PRIORITY_SORT_WEIGHT: Record<VerificationPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: 'Waiting Assignment',
  reviewing: 'In Review',
  waiting_student: 'Waiting Student',
  pending_reassignment: 'Pending Reassignment',
  escalated: 'Escalated',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const PRIORITY_LABELS: Record<VerificationPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

export type ReviewActorRole = 'admin' | 'assistant' | 'support';

export function resolveReviewActorRole(options: {
  isAdmin: boolean;
  isAssistant: boolean;
}): ReviewActorRole {
  if (options.isAdmin) return 'admin';
  if (options.isAssistant) return 'assistant';
  return 'support';
}

export function formatVerificationStatus(status: string, assignedTo?: string | null) {
  if (status === 'pending' && !assignedTo) {
    return STATUS_LABELS.pending;
  }
  if (status === 'pending' && assignedTo) {
    return 'Assigned';
  }
  return STATUS_LABELS[status as VerificationStatus] || status.replace(/_/g, ' ');
}

export function isFinalVerificationStatus(status: string) {
  return status === 'approved' || status === 'rejected';
}

export function canStaffClaim(options: {
  status: string;
  assignedTo: string | null | undefined;
  reviewerId: string;
  isAdmin: boolean;
}) {
  if (options.status !== 'pending') return false;
  if (options.isAdmin) return true;
  return !options.assignedTo || options.assignedTo === options.reviewerId;
}

type ReviewRequestAccessRow = {
  status: string;
  reviewed_by?: string | null;
  assigned_to?: string | null;
  updated_at?: string | null;
};

export function assertVerificationOwner(
  row: ReviewRequestAccessRow,
  actorId: string,
  options: { isAdmin?: boolean; allowPendingReassignmentBlock?: boolean } = {}
) {
  const isAdmin = options.isAdmin ?? false;

  if (isFinalVerificationStatus(row.status)) {
    return { ok: false as const, code: 'FINALIZED' as const, message: 'This request has already been finalized.' };
  }

  if (row.status === 'pending_reassignment' && !isAdmin) {
    return {
      ok: false as const,
      code: 'PENDING_REASSIGNMENT' as const,
      message: 'Reassignment is pending admin approval. You cannot act on this request.',
    };
  }

  if (isAdmin) {
    return { ok: true as const };
  }

  const activeReviewer = row.reviewed_by || row.assigned_to;
  if (activeReviewer && activeReviewer !== actorId) {
    if (row.status === 'reviewing' && row.reviewed_by && !isLockExpired(row.updated_at)) {
      return {
        ok: false as const,
        code: 'LOCKED' as const,
        message: 'This request is owned by another reviewer.',
      };
    }
    if (row.assigned_to && row.assigned_to !== actorId) {
      return {
        ok: false as const,
        code: 'NOT_ASSIGNED' as const,
        message: 'This request is assigned to another reviewer.',
      };
    }
  }

  if (row.status === 'reviewing' && row.reviewed_by && row.reviewed_by !== actorId && !isLockExpired(row.updated_at)) {
    return {
      ok: false as const,
      code: 'LOCKED' as const,
      message: 'This request is being reviewed by another staff member.',
    };
  }

  return { ok: true as const };
}

export function sortByPriorityThenCreated<T extends { priority?: string | null; created_at: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aWeight = PRIORITY_SORT_WEIGHT[(a.priority as VerificationPriority) || 'normal'] ?? 2;
    const bWeight = PRIORITY_SORT_WEIGHT[(b.priority as VerificationPriority) || 'normal'] ?? 2;
    if (aWeight !== bWeight) return aWeight - bWeight;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export function formatWaitingDuration(createdAt: string) {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}
