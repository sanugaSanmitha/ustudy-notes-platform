import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { getAdminDashboardData } from '@/lib/admin/dashboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  try {
    const data = await getAdminDashboardData();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to load dashboard.' } }, { status: 500 });
  }
}
