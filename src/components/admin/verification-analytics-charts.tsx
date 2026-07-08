'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type VerificationAnalyticsData = {
  statusDistribution: Array<{ name: string; status: string; value: number; color: string }>;
  monthlyData: Array<{ month: string; approved: number; rejected: number; pending: number }>;
  weeklyData: Array<{ day: string; submissions: number; resolved: number }>;
  summary: {
    approved: number;
    rejected: number;
    reviewing: number;
    waiting: number;
    escalated: number;
  };
};

type VerificationAnalyticsChartsProps = {
  data: VerificationAnalyticsData;
  title?: string;
  compact?: boolean;
};

type ChartType = 'bar' | 'pie' | 'line';

export function VerificationAnalyticsCharts({
  data,
  title = 'Verification Analytics',
  compact = false,
}: VerificationAnalyticsChartsProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');

  const chartHeight = compact ? 280 : 384;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            {(
              [
                { id: 'bar' as const, label: 'Bar', icon: BarChart3 },
                { id: 'pie' as const, label: 'Pie', icon: PieChartIcon },
                { id: 'line' as const, label: 'Line', icon: TrendingUp },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setChartType(id)}
                className={cn(
                  'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  chartType === id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className="mr-1 h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="approved" fill="#22c55e" name="Approved" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rejected" fill="#ef4444" name="Rejected" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={data.statusDistribution}
                cx="50%"
                cy="50%"
                labelLine
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={compact ? 90 : 130}
                dataKey="value"
              >
                {data.statusDistribution.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : (
            <LineChart data={data.weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="submissions" stroke="#3b82f6" strokeWidth={2} name="Submissions" />
              <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} name="Resolved" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-5">
        {(
          [
            { label: 'Approved', value: data.summary.approved, className: 'text-emerald-600' },
            { label: 'Rejected', value: data.summary.rejected, className: 'text-red-600' },
            { label: 'In Review', value: data.summary.reviewing, className: 'text-violet-600' },
            { label: 'Waiting', value: data.summary.waiting, className: 'text-amber-600' },
            { label: 'Escalated', value: data.summary.escalated, className: 'text-red-700' },
          ] as const
        ).map((item) => (
          <div key={item.label} className="text-center">
            <p className={cn('text-xl font-bold', item.className)}>{item.value}</p>
            <p className="text-xs text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
