'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { SupportQueueList, type SupportQueueItem } from '@/components/admin/support-queue-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

type QueueResponse = {
  data?: {
    queue?: SupportQueueItem[];
  };
  error?: {
    message?: string;
  };
};

export default function AdminSupportQueuePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<SupportQueueItem[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);

  const fetchQueue = async (options?: { mineOnly?: boolean; isRefresh?: boolean }) => {
    const resolvedMineOnly = options?.mineOnly ?? mineOnly;
    if (options?.isRefresh) setRefreshing(true);
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
    } finally {
      if (options?.isRefresh) setRefreshing(false);
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
    <AdminShell
      title="Support Queue"
      description="Review and triage transcript verification cases from the human-in-the-loop queue."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              const next = !mineOnly;
              setMineOnly(next);
              await fetchQueue({ mineOnly: next });
            }}
            disabled={loading}
          >
            {mineOnly ? 'Show All Open Queue' : 'Show My Queue'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchQueue({ isRefresh: true })}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      }
    >
      {loading ? (
        <Card className="p-6 text-sm text-slate-600">Loading support queue…</Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card>
      ) : (
        <SupportQueueList queue={queue} updatingId={updatingId} onAction={handleQueueAction} />
      )}
    </AdminShell>
  );
}
