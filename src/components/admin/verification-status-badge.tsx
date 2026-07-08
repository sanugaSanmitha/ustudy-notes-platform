import { cn } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/grades/admin-users';

const STATUS_STYLES: Record<VerificationStatus, string> = {
  verified: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  none: 'bg-slate-50 text-slate-600 ring-slate-200',
};

const STATUS_LABELS: Record<VerificationStatus, string> = {
  verified: 'Verified',
  pending: 'Pending',
  rejected: 'Rejected',
  none: 'Not verified',
};

type VerificationStatusBadgeProps = {
  status: VerificationStatus;
  className?: string;
};

export function VerificationStatusBadge({ status, className }: VerificationStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function formatVerificationStatusLabel(status: VerificationStatus) {
  return STATUS_LABELS[status];
}
