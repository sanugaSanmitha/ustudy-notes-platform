import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { getAdminUserDetail } from '@/lib/grades/admin-users';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: { userId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const result = await getAdminUserDetail(context.params.userId);
  if (!result.ok) {
    if ('notFound' in result && result.notFound) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User not found.' } }, { status: 404 });
    }
    console.error('Admin user detail error:', result.error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch user details.' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: result }, { status: 200 });
}
