import { NextResponse } from 'next/server';
import { requireVerificationReviewer } from '@/lib/grades/admin';
import { fetchAdminReviewStats, listAdminReviewRequests } from '@/lib/grades/admin-review';

export const dynamic = 'force-dynamic';

function formatFetchError(message: string, migrationHint: string | null) {
  return migrationHint ? `${message} ${migrationHint}` : message;
}

export async function GET(request: Request) {
  const auth = await requireVerificationReviewer();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const url = new URL(request.url);
  const status = (url.searchParams.get('status') || 'pending').trim().toLowerCase();
  const allowedStatus = new Set([
    'pending',
    'waiting_assignment',
    'reviewing',
    'waiting_student',
    'pending_reassignment',
    'escalated',
    'approved',
    'rejected',
    'all',
  ]);
  const statusFilter = allowedStatus.has(status) ? status : 'pending';
  const search = url.searchParams.get('search') || '';
  const risk = url.searchParams.get('risk') || 'all';
  const priority = url.searchParams.get('priority') || 'all';
  const assignedTo = url.searchParams.get('assignedTo') || undefined;
  const dateFrom = url.searchParams.get('dateFrom') || undefined;
  const dateTo = url.searchParams.get('dateTo') || undefined;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10) || 25));

  const [listResult, stats] = await Promise.all([
    listAdminReviewRequests(statusFilter, { search, risk, priority, assignedTo, dateFrom, dateTo, page, pageSize }),
    fetchAdminReviewStats(),
  ]);

  if (!listResult.ok) {
    console.error('Admin review list fetch error:', listResult.error);
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: formatFetchError('Failed to fetch admin review requests.', listResult.migrationHint),
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: {
        requests: listResult.requests,
        stats,
        pagination: {
          page,
          pageSize,
          total: listResult.total,
          totalPages: Math.max(1, Math.ceil(listResult.total / pageSize)),
        },
      },
    },
    { status: 200 }
  );
}
