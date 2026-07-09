import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { fetchAdminNoteListingDetail } from '@/lib/notes/admin-notes';
import { createTranscriptSignedUrl } from '@/lib/grades/transcript-storage';
import { gradeVerificationConfig } from '@/lib/grades/config';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { listingId: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const result = await fetchAdminNoteListingDetail(params.listingId);

  if (!result.ok) {
    if ('notFound' in result && result.notFound) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Note listing not found.' } }, { status: 404 });
    }

    console.error('Admin note listing detail error:', result.error);
    const migrationHint = 'missingMigration' in result ? result.missingMigration : null;
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: migrationHint
            ? `Failed to load note listing. Run docs/migrations/${migrationHint} in Supabase SQL Editor.`
            : 'Failed to load note listing.',
        },
      },
      { status: 500 }
    );
  }

  let downloadUrl: string | null = null;
  let downloadUrlError: string | null = null;

  if (result.listing.zipStorageBucket && result.listing.zipStoragePath) {
    try {
      downloadUrl = await createTranscriptSignedUrl(
        result.listing.zipStorageBucket,
        result.listing.zipStoragePath,
        gradeVerificationConfig.signedUrlExpiresSeconds
      );
    } catch (signedError) {
      console.error('Admin note listing signed URL error:', signedError);
      downloadUrlError = 'Unable to create download link for this ZIP file.';
    }
  } else {
    downloadUrlError = 'ZIP file is unavailable for this listing.';
  }

  return NextResponse.json(
    {
      data: {
        listing: result.listing,
        downloadUrl,
        downloadUrlError,
        readOnly: result.listing.status !== 'pending_review',
      },
    },
    { status: 200 }
  );
}
