'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AdminShell } from '@/components/admin/admin-shell';
import { StatCard } from '@/components/admin/stat-card';
import type { VerificationAnalyticsData } from '@/components/admin/verification-analytics-charts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { SummaryDatePreset } from '@/lib/grades/summary-date-range';
import { Download, RefreshCw } from 'lucide-react';

const VerificationAnalyticsCharts = dynamic(
  () =>
    import('@/components/admin/verification-analytics-charts').then((module) => ({
      default: module.VerificationAnalyticsCharts,
    })),
  {
    loading: () => <div className="h-72 animate-pulse rounded-lg bg-slate-100" />,
  }
);

type SummaryCards = {
  totalVerifications: number;
  approved: number;
  rejected: number;
  pending: number;
  inReview: number;
  waitingStudent: number;
  escalated: number;
  approvalRate: number;
  rejectionRate: number;
  averageReviewTimeLabel: string;
  autoApproved: number;
  manualReviews: number;
};

type SummaryData = {
  range: { preset: SummaryDatePreset; from: string | null; to: string };
  cards: SummaryCards;
  analytics: VerificationAnalyticsData | null;
  pipeline: {
    uploaded: number;
    aiParsed: number;
    autoApproved: number;
    manualReview: number;
    approved: number;
    rejected: number;
  };
  riskDistribution: Array<{ level: string; label: string; value: number; percentage: number }>;
  queueTrend: Array<{ status: string; label: string; value: number }>;
  processingTime: {
    autoApproval: string;
    manualReview: string;
    waitingStudent: string;
    escalated: string;
  };
  topReviewers: Array<{
    id: string;
    name: string;
    casesReviewed: number;
    approvalRate: number;
    averageReviewTimeLabel: string;
  }>;
};

const DATE_PRESETS: Array<{ value: SummaryDatePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

function exportSummaryCsv(data: SummaryData) {
  const rows = [
    ['Metric', 'Value'],
    ['Total Verifications', data.cards.totalVerifications],
    ['Approved', data.cards.approved],
    ['Rejected', data.cards.rejected],
    ['Pending', data.cards.pending],
    ['In Review', data.cards.inReview],
    ['Waiting Student', data.cards.waitingStudent],
    ['Escalated', data.cards.escalated],
    ['Approval Rate', `${data.cards.approvalRate}%`],
    ['Rejection Rate', `${data.cards.rejectionRate}%`],
    ['Average Review Time', data.cards.averageReviewTimeLabel],
    ['Auto Approved', data.cards.autoApproved],
    ['Manual Reviews', data.cards.manualReviews],
  ];
  const csv = rows.map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `verification-summary-${data.range.preset}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<SummaryData | null>(null);
  const [preset, setPreset] = useState<SummaryDatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ preset });
    if (preset === 'custom') {
      if (customFrom) params.set('from', customFrom);
      if (customTo) params.set('to', customTo);
    }
    return params.toString();
  }, [preset, customFrom, customTo]);

  const fetchSummary = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/admin/summary?${queryString}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setError(result?.error?.message || 'Failed to load summary.');
          return;
        }
        setData(result.data);
      } catch {
        setError('Unable to load summary.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [queryString]
  );

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <AdminShell
      title="Transcript Verification Summary"
      description="System analytics and historical reports"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fetchSummary(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {data && (
            <Button type="button" variant="outline" size="sm" onClick={() => exportSummaryCsv(data)}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      }
    >
      <Card className="mb-6 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Date Filter</h2>
        <p className="mt-1 text-xs text-slate-500">All metrics below use the same date range.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DATE_PRESETS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={preset === option.value ? 'default' : 'outline'}
              className={preset === option.value ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
              onClick={() => setPreset(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="mt-3 flex flex-wrap gap-3">
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-40" aria-label="From date" />
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-40" aria-label="To date" />
          </div>
        )}
      </Card>

      {loading ? (
        <p className="text-sm text-slate-600">Loading summary…</p>
      ) : error ? (
        <p className="text-sm text-red-600">
          {error}{' '}
          <button type="button" className="underline" onClick={() => fetchSummary()}>
            Retry
          </button>
        </p>
      ) : data ? (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Summary Cards</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              <StatCard label="Total Verifications" value={data.cards.totalVerifications} accent="neutral" />
              <StatCard label="Approved" value={data.cards.approved} accent="green" />
              <StatCard label="Rejected" value={data.cards.rejected} accent="red" />
              <StatCard label="Pending" value={data.cards.pending} accent="amber" />
              <StatCard label="In Review" value={data.cards.inReview} accent="neutral" />
              <StatCard label="Waiting Student" value={data.cards.waitingStudent} accent="amber" />
              <StatCard label="Escalated" value={data.cards.escalated} accent="red" />
              <StatCard label="Approval Rate" value={`${data.cards.approvalRate}%`} accent="green" />
              <StatCard label="Rejection Rate" value={`${data.cards.rejectionRate}%`} accent="red" />
              <StatCard label="Average Review Time" value={data.cards.averageReviewTimeLabel} accent="neutral" />
              <StatCard label="Auto Approved" value={data.cards.autoApproved} accent="green" />
              <StatCard label="Manual Reviews" value={data.cards.manualReviews} accent="amber" />
            </div>
          </section>

          {data.analytics && (
            <section>
              <VerificationAnalyticsCharts data={data.analytics} title="Verification Analytics" />
            </section>
          )}

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900">Pipeline Analytics</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ['Uploaded', data.pipeline.uploaded],
                  ['AI Parsed', data.pipeline.aiParsed],
                  ['Auto Approved', data.pipeline.autoApproved],
                  ['Manual Review', data.pipeline.manualReview],
                  ['Approved', data.pipeline.approved],
                  ['Rejected', data.pipeline.rejected],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <dt className="text-slate-600">{label}</dt>
                    <dd className="font-semibold text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900">Risk Analytics</h3>
              <div className="mt-4 space-y-3">
                {data.riskDistribution.map((item) => (
                  <div key={item.level}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-700">{item.label} Risk</span>
                      <span className="font-medium text-slate-900">
                        {item.value} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900">Processing Time</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ['Auto Approval', data.processingTime.autoApproval],
                  ['Manual Review', data.processingTime.manualReview],
                  ['Waiting Student', data.processingTime.waitingStudent],
                  ['Escalated Cases', data.processingTime.escalated],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <dt className="text-slate-600">{label}</dt>
                    <dd className="font-semibold text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900">Queue Trend</h3>
              <div className="mt-4 space-y-3">
                {data.queueTrend.map((item) => (
                  <div key={item.status} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900">Top Reviewers</h3>
              {data.topReviewers.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">No reviewer activity in this date range.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Admin</th>
                        <th className="px-2 py-2">Cases Reviewed</th>
                        <th className="px-2 py-2">Approval Rate</th>
                        <th className="px-2 py-2">Avg Review Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topReviewers.map((reviewer) => (
                        <tr key={reviewer.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-2 py-2 font-medium text-slate-900">{reviewer.name}</td>
                          <td className="px-2 py-2 text-slate-700">{reviewer.casesReviewed}</td>
                          <td className="px-2 py-2 text-slate-700">{reviewer.approvalRate}%</td>
                          <td className="px-2 py-2 text-slate-700">{reviewer.averageReviewTimeLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => data && exportSummaryCsv(data)}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button type="button" variant="outline" size="sm" disabled title="PDF export coming soon">
              Export PDF
            </Button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
