export type SummaryDatePreset = 'today' | '7d' | '30d' | '90d' | 'year' | 'all' | 'custom';

export type SummaryDateRange = {
  preset: SummaryDatePreset;
  from: string | null;
  to: string;
};

export function startOfUtcDay(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export function resolveSummaryDateRange(
  preset: SummaryDatePreset,
  customFrom?: string | null,
  customTo?: string | null
): SummaryDateRange {
  const now = new Date();
  const to = customTo ? new Date(`${customTo}T23:59:59.999Z`) : now;

  if (preset === 'custom' && customFrom) {
    return {
      preset,
      from: new Date(`${customFrom}T00:00:00.000Z`).toISOString(),
      to: to.toISOString(),
    };
  }

  if (preset === 'all') {
    return { preset, from: null, to: to.toISOString() };
  }

  if (preset === 'today') {
    return { preset, from: startOfUtcDay(now).toISOString(), to: to.toISOString() };
  }

  const from = startOfUtcDay(now);
  if (preset === '7d') from.setUTCDate(from.getUTCDate() - 6);
  if (preset === '30d') from.setUTCDate(from.getUTCDate() - 29);
  if (preset === '90d') from.setUTCDate(from.getUTCDate() - 89);
  if (preset === 'year') from.setUTCMonth(0, 1);

  return { preset, from: from.toISOString(), to: to.toISOString() };
}

export function formatDurationMinutes(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '—';
  if (totalMinutes < 60) return `${Math.round(totalMinutes)}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function parseSummaryPreset(value: string | null | undefined): SummaryDatePreset {
  const allowed: SummaryDatePreset[] = ['today', '7d', '30d', '90d', 'year', 'all', 'custom'];
  return allowed.includes(value as SummaryDatePreset) ? (value as SummaryDatePreset) : 'all';
}
