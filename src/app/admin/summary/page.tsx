'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminSummarySection } from '@/components/admin/admin-summary-section';
import type { AdminSummaryReport } from '@/lib/admin/summary-report';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { SummaryDatePreset } from '@/lib/grades/summary-date-range';
import { Download, RefreshCw } from 'lucide-react';

type SummaryPayload = {
  range: AdminSummaryReport['range'];
  transcript: Omit<AdminSummaryReport, 'range'>;
  notes: Omit<AdminSummaryReport, 'range'>;
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

function withRange(range: AdminSummaryReport['range'], section: Omit<AdminSummaryReport, 'range'>): AdminSummaryReport {
  return { range, ...section };
}

function exportCombinedCsv(data: SummaryPayload) {
  const transcript = withRange(data.range, data.transcript);
  const notes = withRange(data.range, data.notes);
  const rows = [
    ['Section', 'Metric', 'Value'],
    ...[
      ['Transcript', 'Total Verifications', transcript.cards.totalVerifications],
      ['Transcript', 'Approved', transcript.cards.approved],
      ['Transcript', 'Rejected', transcript.cards.rejected],
      ['Notes', 'Total Verifications', notes.cards.totalVerifications],
      ['Notes', 'Approved', notes.cards.approved],
      ['Notes', 'Rejected', notes.cards.rejected],
    ].map(([section, metric, value]) => [section, metric, value]),
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
  const [data, setData] = useState<SummaryPayload | null>(null);
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
      title="Verification Summary"
      description="Transcript and note listing analytics with shared date filters"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fetchSummary(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {data && (
            <Button type="button" variant="outline" size="sm" onClick={() => exportCombinedCsv(data)}>
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
        <div className="space-y-12">
          <AdminSummarySection
            title="Transcript Verification Summary"
            data={withRange(data.range, data.transcript)}
            exportPrefix="transcript-verification-summary"
            riskTitle="Risk Analytics"
          />

          <div className="border-t border-slate-200 pt-10">
            <AdminSummarySection
              title="Note Verification Summary"
              data={withRange(data.range, data.notes)}
              exportPrefix="note-verification-summary"
              riskTitle="Reject Reason Analytics"
              pipelineLabels={[
                ['Submitted', data.notes.pipeline.uploaded],
                ['Seller Verified', data.notes.pipeline.aiParsed],
                ['Auto Approved', data.notes.pipeline.autoApproved],
                ['Manual Review', data.notes.pipeline.manualReview],
                ['Approved', data.notes.pipeline.approved],
                ['Rejected', data.notes.pipeline.rejected],
              ]}
            />
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
