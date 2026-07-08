import { cn } from '@/lib/utils';
import {
  formatVerificationStatus,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type VerificationPriority,
} from '@/lib/grades/verification-workflow';

const PRIORITY_STYLES: Record<VerificationPriority, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-slate-100 text-slate-700',
};

export function VerificationPriorityBadge({
  priority = 'normal',
  className,
}: {
  priority?: string | null;
  className?: string;
}) {
  const value = (priority || 'normal') as VerificationPriority;
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        PRIORITY_STYLES[value] || PRIORITY_STYLES.normal,
        className
      )}
    >
      {PRIORITY_LABELS[value] || priority}
    </span>
  );
}

export function VerificationStatusBadge({
  status,
  assignedTo,
  className,
}: {
  status: string;
  assignedTo?: string | null;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700', className)}>
      {formatVerificationStatus(status, assignedTo)}
    </span>
  );
}

export function getStatusLabel(status: string) {
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status.replace(/_/g, ' ');
}
