import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { fetchAdminNoteListingDetail } from '@/lib/notes/admin-notes';
import { createTranscriptSignedUrl } from '@/lib/grades/transcript-storage';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { listingId: string } };

export async function POST(_request: Request, { params }: RouteContext) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const result = await fetchAdminNoteListingDetail(params.listingId);

  if (!result.ok) {
    if ('notFound' in result && result.notFound) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Note listing not found.' } }, { status: 404 });
    }

    console.error('Admin note listing download error:', result.error);
    return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to load note listing.' } }, { status: 500 });
  }

  const { listing } = result;

  if (!listing.zipStorageBucket || !listing.zipStoragePath) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'ZIP file unavailable.' } }, { status: 404 });
  }

  const downloadUrl = await createTranscriptSignedUrl(listing.zipStorageBucket, listing.zipStoragePath);
  if (!downloadUrl) {
    return NextResponse.json({ error: { code: 'STORAGE_ERROR', message: 'Failed to create download link.' } }, { status: 500 });
  }

  return NextResponse.json({ data: { downloadUrl } }, { status: 200 });
}
