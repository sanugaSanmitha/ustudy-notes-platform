'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type QueueItem = {
  id: string;
  verification_id: string;
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

type QueueResponse = {
  data?: {
    queue?: QueueItem[];
  };
  error?: {
    message?: string;
  };
};

const STATUS_LABELS: Record<QueueItem['status'], string> = {
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

export default function SupportGradesQueuePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);

  const fetchQueue = async (options?: { mineOnly?: boolean }) => {
    const resolvedMineOnly = options?.mineOnly ?? mineOnly;
    try {
      const query = resolvedMineOnly ? '?mine=true' : '';
      const response = await fetch(`/api/support/grades/queue${query}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const result: QueueResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error?.message || 'Failed to load support queue.');
        return;
      }

      setError('');
      setQueue(result.data?.queue || []);
    } catch (queueError) {
      console.error('Support queue load error:', queueError);
      setError('Unable to load support queue right now.');
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchQueue();
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQueueAction = async (queueId: string, action: 'assign_to_me' | 'unassign' | 'mark_under_review') => {
    setUpdatingId(queueId);
    setError('');

    try {
      const response = await fetch('/api/support/grades/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId, action }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error?.message || 'Failed to update queue item.');
        return;
      }

      await fetchQueue();
    } catch (actionError) {
      console.error('Support queue action error:', actionError);
      setError('Unable to update queue item right now.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-5xl px-4 py-8 text-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Support Transcript Queue</h1>
          <p className="mt-2 text-slate-600">
            Review and triage transcript verification cases from the human-in-the-loop queue.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            const next = !mineOnly;
            setMineOnly(next);
            await fetchQueue({ mineOnly: next });
          }}
          disabled={loading}
        >
          {mineOnly ? 'Show All Open Queue' : 'Show My Queue'}
        </Button>
      </div>

      {loading ? (
        <Card className="mt-6 p-6 text-sm text-slate-600">Loading support queue...</Card>
      ) : error ? (
        <Card className="mt-6 border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card>
      ) : queue.length === 0 ? (
        <Card className="mt-6 p-6 text-sm text-slate-700">No queue items available right now.</Card>
      ) : (
        <div className="mt-6 space-y-4">
          {queue.map((item) => {
            const isUpdating = updatingId === item.id;
            return (
              <Card key={item.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      {item.users?.full_name || 'Unknown Student'} ({item.users?.email || 'unknown email'})
                    </p>
                    <p className="text-xs text-slate-500">
                      Status: {STATUS_LABELS[item.status]} | Tier: {item.queue_tier} | Confidence:{' '}
                      {item.confidence_score ?? 'n/a'}
                    </p>
                    <p className="text-xs text-slate-500">
                      File: {item.grade_verifications?.transcript_filename || 'Transcript.pdf'} | Risk:{' '}
                      {item.grade_verifications?.risk_level || 'unknown'} ({item.grade_verifications?.risk_score ?? 'n/a'})
                    </p>
                    <p className="text-xs text-slate-500">
                      Created: {new Date(item.created_at).toLocaleString()}
                    </p>
                    {item.failure_reason && (
                      <p className="text-xs text-amber-700">Reason: {item.failure_reason}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleQueueAction(item.id, 'assign_to_me')}
                      disabled={isUpdating}
                    >
                      Assign To Me
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleQueueAction(item.id, 'mark_under_review')}
                      disabled={isUpdating}
                    >
                      Mark Under Review
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleQueueAction(item.id, 'unassign')}
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
      )}
      </div>
    </div>
  );
}
