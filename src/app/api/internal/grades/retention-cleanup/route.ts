import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { deleteTranscriptFile } from '@/lib/grades/transcript-storage';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest) {
  const expected = process.env.GRADE_RETENTION_CRON_SECRET || '';
  if (!expected) {
    return false;
  }
  const provided = request.headers.get('x-cron-secret') || '';
  return expected === provided;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Invalid cron secret.' } },
      { status: 403 }
    );
  }

  try {
    const now = new Date().toISOString();
    const { data: rows, error: fetchError } = await adminClient
      .from('grade_verifications')
      .select('id, transcript_storage_bucket, transcript_storage_path')
      .eq('status', 'rejected')
      .not('transcript_storage_bucket', 'is', null)
      .not('transcript_storage_path', 'is', null)
      .lte('rejected_retention_until', now)
      .limit(200);

    if (fetchError) {
      console.error('Retention cleanup fetch error:', fetchError);
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: 'Failed to load retention cleanup candidates.' } },
        { status: 500 }
      );
    }

    let deleted = 0;
    let failed = 0;
    for (const row of rows || []) {
      try {
        await deleteTranscriptFile(row.transcript_storage_bucket, row.transcript_storage_path);
        const { error: updateError } = await adminClient
          .from('grade_verifications')
          .update({
            transcript_storage_bucket: null,
            transcript_storage_path: null,
            transcript_storage_uploaded_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);
        if (updateError) {
          failed += 1;
          console.error('Retention cleanup update error:', updateError);
        } else {
          deleted += 1;
        }
      } catch (error) {
        failed += 1;
        console.error('Retention cleanup delete error:', error);
      }
    }

    return NextResponse.json(
      {
        data: {
          scanned: (rows || []).length,
          deleted,
          failed,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Retention cleanup error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Retention cleanup failed.' } },
      { status: 500 }
    );
  }
}
