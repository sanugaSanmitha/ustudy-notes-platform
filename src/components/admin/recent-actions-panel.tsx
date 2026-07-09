'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';

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
  return (
    <Card className="bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Recent Actions</h2>
      {actions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No recent activity.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100" aria-live="polite">
          {actions.map((action) => (
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
      )}
    </Card>
  );
}
