import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { listAdminNoteListings } from '@/lib/notes/admin-notes';

export const dynamic = 'force-dynamic';

/** Convenience alias for the pending review queue. */
export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const url = new URL(request.url);
  url.searchParams.set('status', 'pending_review');

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10) || 25));

  const result = await listAdminNoteListings({
    status: 'pending_review',
    search: url.searchParams.get('search') || '',
    page,
    pageSize,
  });

  if (!result.ok) {
    console.error('Admin pending notes list error:', result.error);
    const migrationHint = 'missingMigration' in result ? result.missingMigration : null;
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: migrationHint
            ? `Failed to load pending note listings. Run docs/migrations/${migrationHint} in Supabase SQL Editor.`
            : 'Failed to load pending note listings.',
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
      },
    },
    { status: 200 }
  );
}
