'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const INITIAL_VISIBLE = 5;
const SHOW_MORE_STEP = 5;

type AuditAction = {
  id: string;
  action_type: string;
  created_at: string;
  notes: string | null;
  review_request_id: string | null;
  actor?: { full_name: string | null; email: string | null } | null;
};

type RecentActionsPanelProps = {
  actions: AuditAction[];
};

function formatAction(type: string) {
  const labels: Record<string, string> = {
    admin_approved: 'approved transcript',
    admin_rejected: 'rejected transcript',
    review_assigned: 'assigned verification',
    review_reassigned: 'reassigned verification',
    review_claimed: 'claimed review',
    review_escalated: 'escalated request',
    request_more_info: 'requested more information',
    student_replied: 'received student response',
    review_takeover: 'took over review',
    priority_changed: 'changed priority',
    reassignment_requested: 'requested reassignment',
  };
  return labels[type] || type.replace(/_/g, ' ');
}

function formatClockTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function RecentActionsPanel({ actions }: RecentActionsPanelProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const cappedVisibleCount = Math.min(visibleCount, actions.length);
  const visibleActions = actions.slice(0, cappedVisibleCount);
  const hasMore = cappedVisibleCount < actions.length;
  const isExpanded = cappedVisibleCount > INITIAL_VISIBLE;

  return (
    <Card className="self-start bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Recent Actions</h2>
      {actions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No recent activity.</p>
      ) : (
        <>
          <ul
            className={cn(
              'mt-3 divide-y divide-slate-100',
              isExpanded && 'max-h-80 overflow-y-auto pr-1'
            )}
            aria-live="polite"
          >
            {visibleActions.map((action) => (
              <li key={action.id} className="flex gap-3 py-3 text-sm first:pt-0">
                <span className="w-12 shrink-0 font-mono text-xs text-slate-500">{formatClockTime(action.created_at)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-slate-800">
                    <span className="font-medium">{action.actor?.full_name || action.actor?.email || 'System'}</span>{' '}
                    <span className="text-slate-600">{formatAction(action.action_type)}</span>
                  </p>
                  {action.review_request_id && (
                    <Link href={`/admin/grades/${action.review_request_id}`} className="text-xs text-blue-600 hover:underline">
                      View request
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {hasMore && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-sm"
                onClick={() =>
                  setVisibleCount((count) => Math.min(count + SHOW_MORE_STEP, actions.length))
                }
              >
                Show more ({actions.length - cappedVisibleCount} left)
              </Button>
            )}
            {isExpanded && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-sm text-slate-500"
                onClick={() => setVisibleCount(INITIAL_VISIBLE)}
              >
                Show less
              </Button>
            )}
          </div>
        </>
      )}
      <Link
        href="/admin/audit"
        className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'mt-3 h-auto p-0 text-sm')}
      >
        View audit log →
      </Link>
    </Card>
  );
}
