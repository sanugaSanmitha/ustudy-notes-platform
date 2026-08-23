'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Brush,
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
import { BarChart3, PieChart as PieChartIcon, TrendingUp, ZoomOut } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type VerificationAnalyticsData = {
  statusDistribution: Array<{ name: string; status: string; value: number; color: string }>;
  monthlyData: Array<{
    monthKey: string;
    month: string;
    approved: number;
    rejected: number;
    pending: number;
    reviewing: number;
    escalated: number;
  }>;
  dailyData?: Array<{
    monthKey: string;
    dateKey: string;
    label: string;
    approved: number;
    rejected: number;
    pending: number;
    reviewing: number;
    escalated: number;
  }>;
  weeklyData: Array<{
    day: string;
    submissions: number;
    resolved: number;
    approved: number;
    rejected: number;
  }>;
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

type MetricKey =
  | 'approved'
  | 'rejected'
  | 'pending'
  | 'reviewing'
  | 'escalated'
  | 'submissions'
  | 'resolved';

type MetricOption = {
  key: MetricKey;
  label: string;
  color: string;
  chartTypes: ChartType[];
};

const METRIC_OPTIONS: MetricOption[] = [
  { key: 'approved', label: 'Approved', color: '#22c55e', chartTypes: ['bar', 'line', 'pie'] },
  { key: 'rejected', label: 'Rejected', color: '#ef4444', chartTypes: ['bar', 'line', 'pie'] },
  { key: 'pending', label: 'Pending', color: '#f59e0b', chartTypes: ['bar', 'pie'] },
  { key: 'reviewing', label: 'In Review', color: '#8b5cf6', chartTypes: ['bar', 'pie'] },
  { key: 'escalated', label: 'Escalated', color: '#b91c1c', chartTypes: ['bar', 'pie'] },
  { key: 'submissions', label: 'Submissions', color: '#3b82f6', chartTypes: ['line'] },
  { key: 'resolved', label: 'Resolved', color: '#10b981', chartTypes: ['line'] },
];

const PRESETS: Array<{ id: string; label: string; metrics: MetricKey[] }> = [
  { id: 'outcomes', label: 'Approved vs Rejected', metrics: ['approved', 'rejected'] },
  { id: 'pipeline', label: 'Pipeline', metrics: ['pending', 'reviewing', 'escalated'] },
  { id: 'activity', label: 'Weekly Activity', metrics: ['submissions', 'resolved', 'approved', 'rejected'] },
  { id: 'all-bar', label: 'All Metrics', metrics: ['approved', 'rejected', 'pending', 'reviewing', 'escalated'] },
];

const PIE_STATUS_KEYS: Record<MetricKey, string[]> = {
  approved: ['approved'],
  rejected: ['rejected'],
  pending: ['pending'],
  reviewing: ['reviewing'],
  escalated: ['escalated'],
  submissions: [],
  resolved: [],
};

const DEFAULT_METRICS: MetricKey[] = ['approved', 'rejected'];

type BarGranularity = 'month' | 'day';

type BrushRange = {
  startIndex: number;
  endIndex: number;
};

type BarTrendPoint = {
  monthKey: string;
  approved: number;
  rejected: number;
  pending: number;
  reviewing: number;
  escalated: number;
  month?: string;
  label?: string;
  dateKey?: string;
};

function formatMonthTitle(monthKey: string) {
  const [year, month] = monthKey.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function metricsForChartType(chartType: ChartType) {
  return METRIC_OPTIONS.filter((option) => option.chartTypes.includes(chartType));
}

export function VerificationAnalyticsCharts({
  data,
  title = 'Verification Analytics',
  compact = false,
}: VerificationAnalyticsChartsProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(DEFAULT_METRICS);
  const [barGranularity, setBarGranularity] = useState<BarGranularity>('month');
  const [focusedMonthKey, setFocusedMonthKey] = useState<string | null>(null);
  const [monthBrushRange, setMonthBrushRange] = useState<BrushRange | null>(null);

  useEffect(() => {
    setBarGranularity('month');
    setFocusedMonthKey(null);
    setMonthBrushRange(null);
  }, [data.monthlyData, data.dailyData]);

  const availableMetrics = useMemo(() => metricsForChartType(chartType), [chartType]);

  const activeMetrics = useMemo(
    () => selectedMetrics.filter((key) => availableMetrics.some((option) => option.key === key)),
    [selectedMetrics, availableMetrics]
  );

  const visibleMetrics = activeMetrics.length > 0 ? activeMetrics : availableMetrics.map((option) => option.key);

  const toggleMetric = (key: MetricKey) => {
    setSelectedMetrics((current) => {
      if (current.includes(key)) {
        const next = current.filter((item) => item !== key);
        return next.length > 0 ? next : [key];
      }
      return [...current, key];
    });
  };

  const applyPreset = (metrics: MetricKey[]) => {
    const allowed = metrics.filter((key) => availableMetrics.some((option) => option.key === key));
    if (allowed.length > 0) setSelectedMetrics(allowed);
  };

  const pieData = useMemo(() => {
    const allowedStatuses = new Set(
      visibleMetrics.flatMap((key) => PIE_STATUS_KEYS[key] || [])
    );
    return data.statusDistribution.filter((entry) => allowedStatuses.has(entry.status));
  }, [data.statusDistribution, visibleMetrics]);

  const monthlyBarData = useMemo(() => {
    if (!monthBrushRange) return data.monthlyData;
    return data.monthlyData.slice(monthBrushRange.startIndex, monthBrushRange.endIndex + 1);
  }, [data.monthlyData, monthBrushRange]);

  const dailyBarData = useMemo(() => {
    if (!focusedMonthKey || !data.dailyData) return [];
    return data.dailyData.filter((point) => point.monthKey === focusedMonthKey);
  }, [data.dailyData, focusedMonthKey]);

  const barChartData: BarTrendPoint[] = barGranularity === 'day' ? dailyBarData : monthlyBarData;
  const barXAxisKey = barGranularity === 'day' ? 'label' : 'month';
  const isZoomedToDays = barGranularity === 'day' && focusedMonthKey !== null;

  const zoomOut = useCallback(() => {
    setBarGranularity('month');
    setFocusedMonthKey(null);
    setMonthBrushRange(null);
  }, []);

  const drillIntoMonth = useCallback(
    (monthKey: string) => {
      if (!data.dailyData?.some((point) => point.monthKey === monthKey)) return;
      setFocusedMonthKey(monthKey);
      setBarGranularity('day');
      setMonthBrushRange(null);
    },
    [data.dailyData]
  );

  const handleBarChartClick = useCallback(
    (state: { activeLabel?: string | number }) => {
      if (barGranularity !== 'month' || !state?.activeLabel) return;
      const monthPoint = data.monthlyData.find((point) => point.month === state.activeLabel);
      if (monthPoint?.monthKey) drillIntoMonth(monthPoint.monthKey);
    },
    [barGranularity, data.monthlyData, drillIntoMonth]
  );

  const handleMonthBrushChange = useCallback(
    (range: BrushRange | null) => {
      if (!range || range.startIndex === undefined || range.endIndex === undefined) {
        setMonthBrushRange(null);
        return;
      }

      const nextRange = {
        startIndex: Math.min(range.startIndex, range.endIndex),
        endIndex: Math.max(range.startIndex, range.endIndex),
      };
      setMonthBrushRange(nextRange);

      if (nextRange.startIndex === nextRange.endIndex) {
        const monthPoint = data.monthlyData[nextRange.startIndex];
        if (monthPoint?.monthKey) drillIntoMonth(monthPoint.monthKey);
      }
    },
    [data.monthlyData, drillIntoMonth]
  );

  const chartHeight = compact ? 280 : 384;

  const renderBars = () =>
    visibleMetrics.map((key) => {
      const option = METRIC_OPTIONS.find((item) => item.key === key);
      if (!option) return null;
      return (
        <Bar
          key={key}
          dataKey={key}
          fill={option.color}
          name={option.label}
          radius={[4, 4, 0, 0]}
        />
      );
    });

  const renderLines = () =>
    visibleMetrics.map((key) => {
      const option = METRIC_OPTIONS.find((item) => item.key === key);
      if (!option) return null;
      return (
        <Line
          key={key}
          type="monotone"
          dataKey={key}
          stroke={option.color}
          strokeWidth={2}
          name={option.label}
          dot={{ r: 3 }}
        />
      );
    });

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">Choose metrics to compare on the chart.</p>
        </div>
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
              onClick={() => {
                setChartType(id);
                const nextAvailable = metricsForChartType(id).map((option) => option.key);
                setSelectedMetrics((current) => {
                  const kept = current.filter((key) => nextAvailable.includes(key));
                  if (kept.length > 0) return kept;
                  if (id === 'line') return ['approved', 'rejected'];
                  return DEFAULT_METRICS;
                });
              }}
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

      <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.filter((preset) =>
            preset.metrics.some((key) => availableMetrics.some((option) => option.key === key))
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.metrics)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {availableMetrics.map((option) => {
            const active = visibleMetrics.includes(option.key);
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => toggleMetric(option.key)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-transparent text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
                style={active ? { backgroundColor: option.color } : undefined}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.9)' : option.color }}
                />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4" style={{ height: chartHeight }}>
        {chartType === 'pie' && pieData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Select at least one pipeline metric to show in the pie chart.
          </div>
        ) : chartType === 'bar' && barChartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No data for this time range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart
                data={barChartData}
                onClick={handleBarChartClick}
                margin={{ bottom: isZoomedToDays ? 8 : 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey={barXAxisKey}
                  tick={{ fontSize: barGranularity === 'day' ? 10 : 12 }}
                  interval={barGranularity === 'day' ? 1 : 0}
                  angle={barGranularity === 'day' ? -35 : 0}
                  textAnchor={barGranularity === 'day' ? 'end' : 'middle'}
                  height={barGranularity === 'day' ? 56 : 30}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {renderBars()}
                {!isZoomedToDays && data.monthlyData.length > 1 ? (
                  <Brush
                    dataKey="month"
                    height={24}
                    stroke="#94a3b8"
                    fill="#f8fafc"
                    travellerWidth={10}
                    startIndex={monthBrushRange?.startIndex ?? 0}
                    endIndex={monthBrushRange?.endIndex ?? data.monthlyData.length - 1}
                    onChange={handleMonthBrushChange}
                  />
                ) : null}
              </BarChart>
            ) : chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={compact ? 90 : 130}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
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
                {renderLines()}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {chartType === 'bar' ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">
            {isZoomedToDays && focusedMonthKey
              ? `Daily view for ${formatMonthTitle(focusedMonthKey)}`
              : 'Click a month or drag the brush to one month to see daily counts.'}
          </p>
          {isZoomedToDays ? (
            <button
              type="button"
              onClick={zoomOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700"
            >
              <ZoomOut className="h-3.5 w-3.5" />
              Show all months
            </button>
          ) : null}
        </div>
      ) : null}

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
