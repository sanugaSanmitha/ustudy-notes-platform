import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { fetchVerificationSummaryReport } from '@/lib/grades/admin-summary';
import { fetchNoteVerificationSummaryReport } from '@/lib/notes/admin-notes-summary';
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

  const [transcriptResult, notesResult] = await Promise.all([
    fetchVerificationSummaryReport(range),
    fetchNoteVerificationSummaryReport(range),
  ]);

  if (!transcriptResult.ok) {
    console.error('Transcript summary fetch error:', transcriptResult.error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to load transcript verification summary.' } },
      { status: 500 }
    );
  }

  if (!notesResult.ok) {
    console.error('Note summary fetch error:', notesResult.error);
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: notesResult.missingMigration
            ? `Note summary unavailable. Run docs/migrations/${notesResult.missingMigration} in Supabase first.`
            : 'Failed to load note verification summary.',
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: {
        range: transcriptResult.range,
        transcript: {
          cards: transcriptResult.cards,
          analytics: transcriptResult.analytics,
          pipeline: transcriptResult.pipeline,
          riskDistribution: transcriptResult.riskDistribution,
          queueTrend: transcriptResult.queueTrend,
          processingTime: transcriptResult.processingTime,
          topReviewers: transcriptResult.topReviewers,
        },
        notes: {
          cards: notesResult.cards,
          analytics: notesResult.analytics,
          pipeline: notesResult.pipeline,
          riskDistribution: notesResult.riskDistribution,
          queueTrend: notesResult.queueTrend,
          processingTime: notesResult.processingTime,
          topReviewers: notesResult.topReviewers,
        },
      },
    },
    { status: 200 }
  );
}
