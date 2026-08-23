'use client';

import dynamic from 'next/dynamic';
import type { AdminSummaryReport } from '@/lib/admin/summary-report';
import { StatCard } from '@/components/admin/stat-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const VerificationAnalyticsCharts = dynamic(
  () =>
    import('@/components/admin/verification-analytics-charts').then((module) => ({
      default: module.VerificationAnalyticsCharts,
    })),
  {
    loading: () => <div className="h-72 animate-pulse rounded-lg bg-slate-100" />,
  }
);

type AdminSummarySectionProps = {
  title: string;
  data: AdminSummaryReport;
  exportPrefix: string;
  riskTitle?: string;
  pipelineLabels?: Array<[string, number]>;
};

function exportSummaryCsv(data: AdminSummaryReport, exportPrefix: string) {
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
  link.download = `${exportPrefix}-${data.range.preset}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminSummarySection({
  title,
  data,
  exportPrefix,
  riskTitle = 'Risk Analytics',
  pipelineLabels,
}: AdminSummarySectionProps) {
  const pipelineRows =
    pipelineLabels ||
    ([
      ['Uploaded', data.pipeline.uploaded],
      ['AI Parsed', data.pipeline.aiParsed],
      ['Auto Approved', data.pipeline.autoApproved],
      ['Manual Review', data.pipeline.manualReview],
      ['Approved', data.pipeline.approved],
      ['Rejected', data.pipeline.rejected],
    ] as Array<[string, number]>);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => exportSummaryCsv(data, exportPrefix)}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Summary Cards</h3>
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
      </div>

      {data.analytics && (
        <div>
          <VerificationAnalyticsCharts data={data.analytics} title="Verification Analytics" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900">Pipeline Analytics</h3>
          <dl className="mt-4 space-y-3 text-sm">
            {pipelineRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-600">{label}</dt>
                <dd className="font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900">{riskTitle}</h3>
          {data.riskDistribution.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No rejections in this date range.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.riskDistribution.map((item) => (
                <div key={item.level}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-700">{item.label}</span>
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
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>

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
  );
}
