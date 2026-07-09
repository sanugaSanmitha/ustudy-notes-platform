'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type QueueSummaryItem = {
  id: string;
  user_id?: string;
  status: string;
  created_at: string;
  student?: { full_name: string | null; email: string | null } | null;
  reviewer?: { full_name: string | null; email: string | null } | null;
};

type QueueSummaryPanelProps = {
  items: QueueSummaryItem[];
  slaHours?: number;
};

function waitingHours(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
}

export function QueueSummaryPanel({ items, slaHours = 48 }: QueueSummaryPanelProps) {
  return (
    <Card className="bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Oldest Waiting</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No pending requests.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const overdue = waitingHours(item.created_at) >= slaHours;
            return (
              <li
                key={item.id}
                className={`rounded border p-3 text-sm ${overdue ? 'border-l-4 border-l-amber-400 border-slate-200' : 'border-slate-200'}`}
              >
                <p className="font-medium">
                  {item.user_id ? (
                    <Link href={`/admin/users/${item.user_id}`} className="text-blue-600 hover:underline">
                      {item.student?.full_name || 'Unknown'}
                    </Link>
                  ) : (
                    item.student?.full_name || 'Unknown'
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(item.created_at).toLocaleDateString()} · {item.status} ·{' '}
                  {item.reviewer?.full_name || 'Unassigned'}
                </p>
                <Link href={`/admin/grades/${item.id}`} className="mt-1 inline-block text-xs text-blue-600 hover:underline">
                  Open →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href="/admin/grades"
        className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'mt-3 h-auto p-0 text-sm')}
      >
        View full queue →
      </Link>
    </Card>
  );
}
