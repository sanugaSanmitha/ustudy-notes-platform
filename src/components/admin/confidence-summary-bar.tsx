import type { CourseReviewRow } from '@/lib/grades/review-model';
import { summarizeReviewRows } from '@/lib/grades/review-model';

type ConfidenceSummaryBarProps = {
  rows: CourseReviewRow[];
  onSegmentClick?: (band: 'green' | 'purple' | 'orange') => void;
};

export function ConfidenceSummaryBar({ rows, onSegmentClick }: ConfidenceSummaryBarProps) {
  const summary = summarizeReviewRows(rows);
  const total = rows.length || 1;

  const segments = [
    { band: 'green' as const, count: summary.green, color: 'bg-emerald-500', label: 'High confidence' },
    { band: 'purple' as const, count: summary.purple, color: 'bg-violet-400', label: 'Edited' },
    { band: 'orange' as const, count: summary.orange, color: 'bg-orange-400', label: 'User added' },
  ].filter((s) => s.count > 0);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-600">
        {summary.green} of {rows.length} rows high-confidence · {summary.purple} edited · {summary.orange} user-added
      </p>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-200">
        {segments.map((segment) => (
          <button
            key={segment.band}
            type="button"
            className={`${segment.color} transition-opacity hover:opacity-80`}
            style={{ width: `${(segment.count / total) * 100}%` }}
            title={`${segment.label}: ${segment.count}`}
            aria-label={`${segment.label}: ${segment.count} rows`}
            onClick={() => onSegmentClick?.(segment.band)}
          />
        ))}
      </div>
    </div>
  );
}
