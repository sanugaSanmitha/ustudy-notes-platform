'use client';

import { Card } from '@/components/ui/card';
import { VerificationPriorityBadge, VerificationStatusBadge } from '@/components/admin/verification-workflow-badges';
import { formatWaitingDuration } from '@/lib/grades/verification-workflow';
import { cn } from '@/lib/utils';

type VerificationStatusSummaryBarProps = {
  requestId: string;
  status: string;
  priority?: string | null;
  createdAt: string;
  reviewStartedAt?: string | null;
  assignedTo?: string | null;
  reviewerName?: string | null;
  updatedAt?: string | null;
};

const PROGRESS_BY_STATUS: Record<string, number> = {
  pending: 25,
  reviewing: 50,
  waiting_student: 40,
  pending_reassignment: 35,
  escalated: 30,
  approved: 85,
  rejected: 85,
};

const PROGRESS_COLOR: Record<string, string> = {
  pending: 'bg-amber-500',
  reviewing: 'bg-blue-600',
  waiting_student: 'bg-orange-500',
  pending_reassignment: 'bg-red-500',
  escalated: 'bg-red-600',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-600',
};

function calculateTimeInReview(reviewStartedAt?: string | null) {
  if (!reviewStartedAt) return 'Not started';
  return formatWaitingDuration(reviewStartedAt);
}

export function VerificationStatusSummaryBar({
  requestId,
  status,
  priority,
  createdAt,
  reviewStartedAt,
  assignedTo,
  reviewerName,
  updatedAt,
}: VerificationStatusSummaryBarProps) {
  const progress = PROGRESS_BY_STATUS[status] ?? 10;
  const progressColor = PROGRESS_COLOR[status] ?? 'bg-slate-400';

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Verification Status</h2>
        <div className="flex flex-wrap items-center gap-2">
          <VerificationStatusBadge status={status} assignedTo={assignedTo} />
          <VerificationPriorityBadge priority={priority} />
          <span className="font-mono text-xs text-slate-500">#{requestId.slice(0, 8)}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn('h-full rounded-full transition-all duration-500', progressColor)}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
          <span>Submitted</span>
          <span>In Review</span>
          <span>Decision</span>
          <span>Closed</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Submitted</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">
            {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Time in Review</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">{calculateTimeInReview(reviewStartedAt)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Assigned To</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">{reviewerName || 'Unassigned'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last Updated</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">
            {updatedAt ? new Date(updatedAt).toLocaleString() : '—'}
          </p>
        </div>
      </div>
    </Card>
  );
}
