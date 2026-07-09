import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { fetchAdminNoteListingStats, listAdminNoteListings, type NoteListingStatus } from '@/lib/notes/admin-notes';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = new Set<NoteListingStatus | 'all'>(['pending_review', 'published', 'rejected', 'all']);

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10) || 25));
  const statusParam = url.searchParams.get('status') || 'pending_review';
  const status = VALID_STATUSES.has(statusParam as NoteListingStatus | 'all')
    ? (statusParam as NoteListingStatus | 'all')
    : 'pending_review';
  const includeStats = url.searchParams.get('stats') === '1';

  const [result, stats] = await Promise.all([
    listAdminNoteListings({
      status,
      search: url.searchParams.get('search') || '',
      page,
      pageSize,
    }),
    includeStats ? fetchAdminNoteListingStats() : Promise.resolve(null),
  ]);

  if (!result.ok) {
    console.error('Admin notes list error:', result.error);
    const migrationHint = 'missingMigration' in result ? result.missingMigration : null;
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: migrationHint
            ? `Failed to load note listings. Run docs/migrations/${migrationHint} in Supabase SQL Editor.`
            : 'Failed to load note listings.',
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: {
        listings: result.listings,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
        stats,
      },
    },
    { status: 200 }
  );
}
