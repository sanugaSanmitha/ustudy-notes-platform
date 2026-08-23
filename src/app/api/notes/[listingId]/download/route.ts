import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { userHasPaidListing } from '@/lib/orders/access';
import { createTranscriptSignedUrl } from '@/lib/grades/transcript-storage';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { listingId: string } };

export async function POST(_request: Request, { params }: RouteContext) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
  }

  const { data: listing, error: listingError } = await adminClient
    .from('note_listings')
    .select('id, user_id, zip_filename, zip_storage_bucket, zip_storage_path')
    .eq('id', params.listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Listing not found.' } }, { status: 404 });
  }

  const isSeller = listing.user_id === user.id;
  const purchased = isSeller ? true : await userHasPaidListing(user.id, listing.id);

  if (!purchased) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'This note is locked until payment is confirmed.' } },
      { status: 403 }
    );
  }

  if (!listing.zip_storage_bucket || !listing.zip_storage_path) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'File is not available yet.' } }, { status: 404 });
  }

  const downloadUrl = await createTranscriptSignedUrl(listing.zip_storage_bucket, listing.zip_storage_path, 3600);
  if (!downloadUrl) {
    return NextResponse.json({ error: { code: 'STORAGE_ERROR', message: 'Failed to create download link.' } }, { status: 500 });
  }

  return NextResponse.json({
    downloadUrl,
    filename: listing.zip_filename || 'notes.zip',
  });
}
