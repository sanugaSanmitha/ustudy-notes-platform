'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { StatCard } from '@/components/admin/stat-card';
import { QueueSummaryPanel } from '@/components/admin/queue-summary-panel';
import { SupportQueueSummaryPanel } from '@/components/admin/support-queue-summary-panel';
import { RecentActionsPanel } from '@/components/admin/recent-actions-panel';
import {
  VerificationAnalyticsCharts,
  type VerificationAnalyticsData,
} from '@/components/admin/verification-analytics-charts';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

type DashboardData = {
  stats: {
    pending: number;
    reviewing: number;
    approvedToday: number;
    rejectedToday: number;
    waitingAssignment?: number;
    waitingStudent?: number;
    pendingReassignment?: number;
    escalated?: number;
  };
  queueSummary: Array<Record<string, unknown>>;
  recentActions: Array<Record<string, unknown>>;
  supportStats: { open: number; underReview: number; fastQueue: number; manualFallback: number };
  supportQueueSummary: Array<Record<string, unknown>>;
  analytics: VerificationAnalyticsData | null;
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
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const secondsAgo = lastUpdated ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000) : null;

  return (
    <AdminShell
      title="Dashboard"
      description="Transcript verification and support queue overview"
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
        <div className="space-y-10">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Verification Queue</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
              <StatCard
                label="Waiting Assignment"
                value={data.stats.waitingAssignment ?? 0}
                accent="amber"
                onClick={() => router.push('/admin/grades?status=waiting_assignment')}
              />
              <StatCard
                label="Pending"
                value={data.stats.pending}
                accent="amber"
                onClick={() => router.push('/admin/grades?status=pending')}
              />
              <StatCard
                label="In Review"
                value={data.stats.reviewing}
                accent="neutral"
                onClick={() => router.push('/admin/grades?status=reviewing')}
              />
              <StatCard
                label="Waiting Student"
                value={data.stats.waitingStudent ?? 0}
                accent="amber"
                onClick={() => router.push('/admin/grades?status=waiting_student')}
              />
              <StatCard
                label="Pending Reassignment"
                value={data.stats.pendingReassignment ?? 0}
                accent="red"
                onClick={() => router.push('/admin/grades?status=pending_reassignment')}
              />
              <StatCard
                label="Escalated"
                value={data.stats.escalated ?? 0}
                accent="red"
                onClick={() => router.push('/admin/grades?status=escalated')}
              />
              <StatCard
                label="Approved Today"
                value={data.stats.approvedToday}
                accent="green"
                onClick={() => router.push('/admin/grades?status=approved')}
              />
              <StatCard
                label="Rejected Today"
                value={data.stats.rejectedToday}
                accent="red"
                onClick={() => router.push('/admin/grades?status=rejected')}
              />
            </div>

            {data.analytics && (
              <div className="mt-6">
                <VerificationAnalyticsCharts data={data.analytics} />
              </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <QueueSummaryPanel items={data.queueSummary as Parameters<typeof QueueSummaryPanel>[0]['items']} />
              </div>
              <RecentActionsPanel actions={data.recentActions as Parameters<typeof RecentActionsPanel>[0]['actions']} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Support Queue</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Open Queue"
                value={data.supportStats.open}
                accent="amber"
                onClick={() => router.push('/admin/support')}
              />
              <StatCard
                label="Under Review"
                value={data.supportStats.underReview}
                accent="neutral"
                onClick={() => router.push('/admin/support')}
              />
              <StatCard
                label="Fast Queue"
                value={data.supportStats.fastQueue}
                accent="green"
                onClick={() => router.push('/admin/support')}
              />
              <StatCard
                label="Manual Fallback"
                value={data.supportStats.manualFallback}
                accent="red"
                onClick={() => router.push('/admin/support')}
              />
            </div>

            <div className="mt-6 lg:max-w-2xl">
              <SupportQueueSummaryPanel
                items={data.supportQueueSummary as Parameters<typeof SupportQueueSummaryPanel>[0]['items']}
              />
            </div>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
