import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { listAdminUsers } from '@/lib/grades/admin-users';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10) || 25));

  const result = await listAdminUsers({
    search: url.searchParams.get('search') || '',
    school: url.searchParams.get('school') || 'all',
    verification: url.searchParams.get('verification') || 'all',
    seller: url.searchParams.get('seller') || 'all',
    joinedFrom: url.searchParams.get('joinedFrom') || undefined,
    joinedTo: url.searchParams.get('joinedTo') || undefined,
    page,
    pageSize,
  });

  if (!result.ok) {
    console.error('Admin users list error:', result.error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch users.' } },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: {
        users: result.users,
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
