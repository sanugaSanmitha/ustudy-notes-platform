export type TrendBucket = {
  monthKey: string;
  approved: number;
  rejected: number;
  pending: number;
  reviewing: number;
  escalated: number;
};

export type MonthlyTrendPoint = TrendBucket & {
  month: string;
};

export type DailyTrendPoint = TrendBucket & {
  dateKey: string;
  label: string;
};

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string) {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'short' });
}

export function dayLabel(date: Date) {
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

export function createMonthlyTrendBuckets(anchor: Date, months = 6) {
  const start = new Date(anchor);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const buckets = new Map<string, MonthlyTrendPoint>();
  for (let i = 0; i < months; i += 1) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + i);
    const key = monthKey(date);
    buckets.set(key, {
      monthKey: key,
      month: monthLabel(key),
      approved: 0,
      rejected: 0,
      pending: 0,
      reviewing: 0,
      escalated: 0,
    });
  }
  return buckets;
}

export function createDailyTrendBuckets(rangeStart: Date, rangeEnd: Date) {
  const buckets = new Map<string, DailyTrendPoint>();
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);
  const endTime = new Date(rangeEnd);
  endTime.setHours(23, 59, 59, 999);

  while (cursor.getTime() <= endTime.getTime()) {
    const dateKey = cursor.toISOString().slice(0, 10);
    buckets.set(dateKey, {
      monthKey: monthKey(cursor),
      dateKey,
      label: dayLabel(cursor),
      approved: 0,
      rejected: 0,
      pending: 0,
      reviewing: 0,
      escalated: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}
