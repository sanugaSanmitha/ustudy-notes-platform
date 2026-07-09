'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { StatCard } from '@/components/admin/stat-card';
import { QueueSummaryPanel } from '@/components/admin/queue-summary-panel';
import { RecentActionsPanel } from '@/components/admin/recent-actions-panel';
import { QuickActionsPanel } from '@/components/admin/quick-actions-panel';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

type DashboardData = {
  queue: {
    waitingAssignment: number;
    pending: number;
    inReview: number;
    waitingStudent: number;
    pendingReassignment: number;
    escalated: number;
  };
  todayActivity: {
    approvedToday: number;
    rejectedToday: number;
    assignedToday: number;
    completedToday: number;
    averageReviewTimeLabel: string;
  };
  queueSummary: Array<Record<string, unknown>>;
  recentActions: Array<Record<string, unknown>>;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/dashboard', { cache: 'no-store', credentials: 'same-origin' });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to load dashboard.');
        return;
      }
      setData(result.data);
      setLastUpdated(new Date());
    } catch {
      setError('Unable to load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchDashboard(true);
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const secondsAgo = lastUpdated ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000) : null;

  return (
    <AdminShell
      title="Dashboard"
      description="Transcript verification & support overview"
      actions={
        <div className="flex items-center gap-3">
          {secondsAgo != null && (
            <span className="text-xs text-slate-500">
              Last updated {secondsAgo}s ago{refreshing ? ' · updating…' : ''}
            </span>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => fetchDashboard(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-600">Loading dashboard…</p>
      ) : error ? (
        <p className="text-sm text-red-600">
          {error}{' '}
          <button type="button" className="underline" onClick={() => fetchDashboard()}>
            Retry
          </button>
        </p>
      ) : data ? (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Verification Queue</h2>
            <p className="mt-1 text-xs text-slate-500">Current live queue status</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              <StatCard
                label="Waiting Assignment"
                value={data.queue.waitingAssignment}
                accent="amber"
                onClick={() => router.push('/admin/grades?status=waiting_assignment')}
              />
              <StatCard
                label="Pending"
                value={data.queue.pending}
                accent="amber"
                onClick={() => router.push('/admin/grades?status=pending')}
              />
              <StatCard
                label="In Review"
                value={data.queue.inReview}
                accent="neutral"
                onClick={() => router.push('/admin/grades?status=reviewing')}
              />
              <StatCard
                label="Waiting Student"
                value={data.queue.waitingStudent}
                accent="amber"
                onClick={() => router.push('/admin/grades?status=waiting_student')}
              />
              <StatCard
                label="Pending Reassignment"
                value={data.queue.pendingReassignment}
                accent="red"
                onClick={() => router.push('/admin/grades?status=pending_reassignment')}
              />
              <StatCard
                label="Escalated"
                value={data.queue.escalated}
                accent="red"
                onClick={() => router.push('/admin/grades?status=escalated')}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Today&apos;s Activity</h2>
            <p className="mt-1 text-xs text-slate-500">Actions completed today only</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Approved Today" value={data.todayActivity.approvedToday} accent="green" />
              <StatCard label="Rejected Today" value={data.todayActivity.rejectedToday} accent="red" />
              <StatCard label="Assigned Today" value={data.todayActivity.assignedToday} accent="neutral" />
              <StatCard label="Completed Today" value={data.todayActivity.completedToday} accent="green" />
              <StatCard label="Average Review Time" value={data.todayActivity.averageReviewTimeLabel} accent="neutral" />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <QueueSummaryPanel items={data.queueSummary as Parameters<typeof QueueSummaryPanel>[0]['items']} />
              <QuickActionsPanel onRefresh={() => fetchDashboard(true)} refreshing={refreshing} />
            </div>
            <RecentActionsPanel actions={data.recentActions as Parameters<typeof RecentActionsPanel>[0]['actions']} />
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
