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

function relativeTime(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatAction(type: string) {
  return type.replace(/_/g, ' ');
}

export function RecentActionsPanel({ actions }: RecentActionsPanelProps) {
  return (
    <Card className="bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Recent Actions</h2>
      {actions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No recent activity.</p>
      ) : (
        <ul className="mt-3 space-y-3" aria-live="polite">
          {actions.map((action) => (
            <li key={action.id} className="text-sm">
              <p className="text-slate-800">
                <span className="font-medium">{action.actor?.full_name || action.actor?.email || 'System'}</span>{' '}
                <span className="text-slate-600">{formatAction(action.action_type)}</span>
              </p>
              <p className="text-xs text-slate-500">
                {relativeTime(action.created_at)}
                {action.review_request_id && (
                  <>
                    {' · '}
                    <Link href={`/admin/grades/${action.review_request_id}`} className="text-blue-600 hover:underline">
                      View request
                    </Link>
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
