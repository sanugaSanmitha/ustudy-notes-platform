'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  queued_support_fast: 'Fast Queue',
  queued_support_normal: 'Normal Queue',
  queued_manual_fallback: 'Manual Fallback',
  under_review: 'Under Review',
};

type SupportQueueSummaryItem = {
  id: string;
  status: string;
  queue_tier: string;
  created_at: string;
  failure_reason?: string | null;
  student?: { full_name: string | null; email: string | null } | null;
  assignee?: { full_name: string | null; email: string | null } | null;
};

type SupportQueueSummaryPanelProps = {
  items: SupportQueueSummaryItem[];
};

export function SupportQueueSummaryPanel({ items }: SupportQueueSummaryPanelProps) {
  return (
    <Card className="bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Oldest Waiting</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No open support queue items.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded border border-slate-200 p-3 text-sm">
              <p className="font-medium">{item.student?.full_name || 'Unknown'}</p>
              <p className="text-xs text-slate-500">
                {new Date(item.created_at).toLocaleDateString()} · {STATUS_LABELS[item.status] || item.status} ·{' '}
                {item.queue_tier} tier · {item.assignee?.full_name || 'Unassigned'}
              </p>
              {item.failure_reason && (
                <p className="mt-1 text-xs text-amber-700">Reason: {item.failure_reason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/admin/support"
        className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'mt-3 h-auto p-0 text-sm')}
      >
        View full queue →
      </Link>
    </Card>
  );
}
