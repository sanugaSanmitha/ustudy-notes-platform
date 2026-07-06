type RiskReason = { code?: string; message?: string; points?: number };

type RiskIndicatorsPanelProps = {
  riskLevel: string | null;
  riskScore: number | null;
  reasons: RiskReason[];
  onReasonClick?: (code: string) => void;
};

function severityClass(level: string | null) {
  const l = (level || '').toLowerCase();
  if (l === 'high') return 'border-red-300 bg-red-50 text-red-800';
  if (l === 'medium') return 'border-amber-300 bg-amber-50 text-amber-900';
  return 'border-slate-300 bg-slate-50 text-slate-700';
}

export function RiskIndicatorsPanel({ riskLevel, riskScore, reasons, onReasonClick }: RiskIndicatorsPanelProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${severityClass(riskLevel)}`}>
          {riskLevel || 'unknown'} risk ({riskScore ?? 'n/a'})
        </span>
        {reasons.map((reason, index) => (
          <button
            key={`${reason.code || 'r'}-${index}`}
            type="button"
            className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-900 hover:bg-amber-100"
            onClick={() => onReasonClick?.(reason.code || '')}
          >
            {reason.code || 'FLAG'} (+{reason.points ?? 0})
          </button>
        ))}
      </div>
      {reasons.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
          {reasons.map((reason, index) => (
            <li key={`detail-${index}`}>{reason.message || 'No details'}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
