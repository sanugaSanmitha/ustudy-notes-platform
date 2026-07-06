import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { fetchAuditLogs } from '@/lib/grades/admin-audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10) || 25));
  const actionType = url.searchParams.get('actionType') || 'all';

  const result = await fetchAuditLogs({ page, pageSize, actionType });
  if (!result.ok) {
    console.error('Audit log fetch error:', result.error);
    return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to load audit logs.' } }, { status: 500 });
  }

  return NextResponse.json({ data: result }, { status: 200 });
}
