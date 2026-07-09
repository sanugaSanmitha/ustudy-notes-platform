import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { fetchVerificationSummaryReport } from '@/lib/grades/admin-summary';
import { parseSummaryPreset, resolveSummaryDateRange } from '@/lib/grades/summary-date-range';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const params = request.nextUrl.searchParams;
  const preset = parseSummaryPreset(params.get('preset'));
  const customFrom = params.get('from');
  const customTo = params.get('to');
  const range = resolveSummaryDateRange(preset, customFrom, customTo);

  const result = await fetchVerificationSummaryReport(range);
  if (!result.ok) {
    console.error('Summary fetch error:', result.error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to load verification summary.' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: result }, { status: 200 });
}
