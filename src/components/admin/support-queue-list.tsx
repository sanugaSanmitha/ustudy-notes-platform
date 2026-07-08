'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type SupportQueueItem = {
  id: string;
  verification_id: string;
  user_id?: string;
  status:
    | 'pending'
    | 'queued_support_fast'
    | 'queued_support_normal'
    | 'queued_manual_fallback'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'reupload_required'
    | 'auto_approved';
  queue_tier: 'fast' | 'normal' | 'manual_fallback';
  confidence_score: number | null;
  parser_source: string | null;
  failure_reason: string | null;
  assigned_to: string | null;
  created_at: string;
  grade_verifications?: {
    id: string;
    status: string;
    transcript_filename: string | null;
    risk_level: string | null;
    risk_score: number | null;
  } | null;
  users?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

const STATUS_LABELS: Record<SupportQueueItem['status'], string> = {
  pending: 'Pending',
  queued_support_fast: 'Fast Queue',
  queued_support_normal: 'Normal Queue',
  queued_manual_fallback: 'Manual Fallback',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  reupload_required: 'Re-upload Required',
  auto_approved: 'Auto Approved',
};

type SupportQueueListProps = {
  queue: SupportQueueItem[];
  updatingId: string | null;
  onAction: (queueId: string, action: 'assign_to_me' | 'unassign' | 'mark_under_review') => void;
};

export function SupportQueueList({ queue, updatingId, onAction }: SupportQueueListProps) {
  if (queue.length === 0) {
    return <Card className="p-6 text-sm text-slate-700">No queue items available right now.</Card>;
  }

  return (
    <div className="space-y-4">
      {queue.map((item) => {
        const isUpdating = updatingId === item.id;
        return (
          <Card key={item.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {item.user_id ? (
                    <Link href={`/admin/users/${item.user_id}`} className="text-blue-600 hover:underline">
                      {item.users?.full_name || 'Unknown Student'}
                    </Link>
                  ) : (
                    item.users?.full_name || 'Unknown Student'
                  )}{' '}
                  ({item.users?.email || 'unknown email'})
                </p>
                <p className="text-xs text-slate-500">
                  Status: {STATUS_LABELS[item.status]} | Tier: {item.queue_tier} | Confidence:{' '}
                  {item.confidence_score ?? 'n/a'}
                </p>
                <p className="text-xs text-slate-500">
                  File: {item.grade_verifications?.transcript_filename || 'Transcript.pdf'} | Risk:{' '}
                  {item.grade_verifications?.risk_level || 'unknown'} ({item.grade_verifications?.risk_score ?? 'n/a'})
                </p>
                <p className="text-xs text-slate-500">Created: {new Date(item.created_at).toLocaleString()}</p>
                {item.failure_reason && <p className="text-xs text-amber-700">Reason: {item.failure_reason}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(item.id, 'assign_to_me')}
                  disabled={isUpdating}
                >
                  Assign To Me
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(item.id, 'mark_under_review')}
                  disabled={isUpdating}
                >
                  Mark Under Review
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(item.id, 'unassign')}
                  disabled={isUpdating}
                >
                  Unassign
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
