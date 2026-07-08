'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminShell, useAdminPortalRole } from '@/components/admin/admin-shell';
import { StatCard } from '@/components/admin/stat-card';
import { VerificationPriorityBadge, VerificationStatusBadge } from '@/components/admin/verification-workflow-badges';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, Lock } from 'lucide-react';
import { adminFetch } from '@/lib/api/admin-client';
import { formatWaitingDuration } from '@/lib/grades/verification-workflow';

type ReviewStatus =
  | 'pending'
  | 'waiting_assignment'
  | 'reviewing'
  | 'waiting_student'
  | 'pending_reassignment'
  | 'escalated'
  | 'approved'
  | 'rejected'
  | 'all';

type AdminReviewRequest = {
  id: string;
  user_id: string;
  issue_type: string;
  message: string | null;
  status: ReviewStatus;
  priority?: string | null;
  queue?: string | null;
  created_at: string;
  grade_verifications?: {
    transcript_filename: string | null;
    risk_level: string | null;
    risk_score: number | null;
  } | null;
  users?: { full_name: string | null; email: string | null } | null;
  assignee?: { full_name: string | null; email: string | null } | null;
  assigned_to?: string | null;
  reviewer?: { full_name: string | null; email: string | null } | null;
  isLocked?: boolean;
};

type ReviewStats = {
  pending: number;
  waitingAssignment?: number;
  reviewing: number;
  waitingStudent?: number;
  pendingReassignment?: number;
  escalated?: number;
  approvedToday: number;
  rejectedToday: number;
};

type StaffMember = {
  id: string;
  full_name: string | null;
  email: string;
  roles: string[];
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const STATUS_FILTERS: Array<{ value: ReviewStatus; label: string }> = [
  { value: 'waiting_assignment', label: 'Waiting Assignment' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'In Review' },
  { value: 'waiting_student', label: 'Waiting Student' },
  { value: 'pending_reassignment', label: 'Pending Reassignment' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

const PRIORITY_FILTERS = [
  { value: 'all', label: 'All priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

const RISK_FILTERS = [
  { value: 'all', label: 'All risk' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function formatWaitingTime(createdAt: string) {
  return formatWaitingDuration(createdAt);
}

export default function AdminGradeReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, isAssistant, isSupport, userId } = useAdminPortalRole();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<AdminReviewRequest[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const statusFilter = (searchParams.get('status') as ReviewStatus) || 'waiting_assignment';
  const riskFilter = searchParams.get('risk') || 'all';
  const priorityFilter = searchParams.get('priority') || 'all';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/admin/grades?${params.toString()}`);
    },
    [router, searchParams]
  );

  const fetchRequests = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams({
          status: statusFilter,
          page: String(page),
          pageSize: '25',
        });
        const search = searchParams.get('search');
        if (search) query.set('search', search);
        if (riskFilter !== 'all') query.set('risk', riskFilter);
        if (priorityFilter !== 'all') query.set('priority', priorityFilter);
        if (dateFrom) query.set('dateFrom', new Date(dateFrom).toISOString());
        if (dateTo) query.set('dateTo', new Date(`${dateTo}T23:59:59`).toISOString());

        const response = await fetch(`/api/admin/grades/reviews?${query.toString()}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setError(result?.error?.message || 'Failed to load admin review requests.');
          return;
        }
        setRequests(result?.data?.requests || []);
        setStats(result?.data?.stats || null);
        setPagination(result?.data?.pagination || null);
      } catch (requestError) {
        console.error('Admin review list fetch error:', requestError);
        setError('Unable to load admin review requests right now.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, riskFilter, priorityFilter, dateFrom, dateTo, page, searchParams]
  );

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchRequests(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get('search') || '';
      if (searchInput !== current) {
        updateParams({ search: searchInput || null, page: '1' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, searchParams, updateParams]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/admin/staff/assistants', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.json())
      .then((result) => setStaff(result?.data?.staff || result?.data?.assistants || []))
      .catch(() => null);
  }, [isAdmin]);

  const handleClaim = async (requestId: string) => {
    setClaimingId(requestId);
    setError('');
    try {
      const response = await adminFetch(`/api/admin/grades/reviews/${requestId}/claim`, { method: 'POST' });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || result?.data?.reviewerName ? `Already claimed by ${result.data.reviewerName}` : 'Failed to claim review request.');
        return;
      }
      if (result?.data?.claimed === false && result?.data?.reviewerName) {
        setError(`Already claimed by ${result.data.reviewerName}.`);
        fetchRequests(true);
        return;
      }
      router.push(`/admin/grades/${requestId}`);
    } finally {
      setClaimingId(null);
    }
  };

  const handleAssignToStaff = async (requestId: string, assigneeUserId: string | null) => {
    setAssigningId(requestId);
    try {
      const response = await adminFetch(`/api/admin/grades/reviews/${requestId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assigneeUserId }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to assign review request.');
        return;
      }
      setError('');
      fetchRequests(true);
    } finally {
      setAssigningId(null);
    }
  };

  const renderAssignee = (request: AdminReviewRequest) => {
    if (request.status === 'reviewing') {
      return request.reviewer?.full_name || request.reviewer?.email || 'In review';
    }
    return request.assignee?.full_name || request.assignee?.email || 'Unassigned';
  };

  const canClaim = (request: AdminReviewRequest) => {
    if (request.status !== 'pending' || request.assigned_to) return false;
    if (isAdmin) return true;
    if ((isAssistant || isSupport) && userId) {
      return !request.assigned_to || request.assigned_to === userId;
    }
    return false;
  };

  const renderStudentName = (request: AdminReviewRequest) => {
    const name = request.users?.full_name || 'Unknown';
    if (isAdmin) {
      return (
        <Link href={`/admin/users/${request.user_id}`} className="font-medium text-blue-600 hover:underline">
          {name}
        </Link>
      );
    }
    return <span className="font-medium text-slate-900">{name}</span>;
  };

  const emptyMessage = useMemo(() => {
    if (searchParams.get('search') || riskFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'waiting_assignment') {
      return 'No requests match your filters.';
    }
    return "You're all caught up — no transcripts waiting for review.";
  }, [searchParams, riskFilter, priorityFilter, statusFilter]);

  return (
    <AdminShell
      title="Verification Queue"
      description="Review escalated transcript verification requests."
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => fetchRequests(true)} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
          <StatCard label="Waiting Assignment" value={stats.waitingAssignment ?? 0} accent="amber" onClick={() => updateParams({ status: 'waiting_assignment', page: '1' })} />
          <StatCard label="Pending" value={stats.pending} accent="amber" onClick={() => updateParams({ status: 'pending', page: '1' })} />
          <StatCard label="In Review" value={stats.reviewing} accent="neutral" onClick={() => updateParams({ status: 'reviewing', page: '1' })} />
          <StatCard label="Waiting Student" value={stats.waitingStudent ?? 0} accent="amber" onClick={() => updateParams({ status: 'waiting_student', page: '1' })} />
          <StatCard label="Pending Reassignment" value={stats.pendingReassignment ?? 0} accent="red" onClick={() => updateParams({ status: 'pending_reassignment', page: '1' })} />
          <StatCard label="Escalated" value={stats.escalated ?? 0} accent="red" onClick={() => updateParams({ status: 'escalated', page: '1' })} />
          <StatCard label="Approved Today" value={stats.approvedToday} accent="green" onClick={() => updateParams({ status: 'approved', page: '1' })} />
          <StatCard label="Rejected Today" value={stats.rejectedToday} accent="red" onClick={() => updateParams({ status: 'rejected', page: '1' })} />
        </div>
      )}

      <Card className="sticky top-16 z-30 mb-4 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search student name or email…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                type="button"
                size="sm"
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                className={statusFilter === filter.value ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                onClick={() => updateParams({ status: filter.value, page: '1' })}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <select
            value={riskFilter}
            onChange={(e) => updateParams({ risk: e.target.value === 'all' ? null : e.target.value, page: '1' })}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm"
          >
            {RISK_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => updateParams({ priority: e.target.value === 'all' ? null : e.target.value, page: '1' })}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm"
          >
            {PRIORITY_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => updateParams({ dateFrom: e.target.value || null, page: '1' })}
            className="h-9 w-36"
            aria-label="From date"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => updateParams({ dateTo: e.target.value || null, page: '1' })}
            className="h-9 w-36"
            aria-label="To date"
          />
        </div>
      </Card>

      {loading ? (
        <Card className="bg-white p-6 text-sm text-slate-600">Loading review requests…</Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}{' '}
          <button type="button" className="underline" onClick={() => fetchRequests()}>
            Retry
          </button>
        </Card>
      ) : requests.length === 0 ? (
        <Card className="bg-white p-8 text-center text-sm text-slate-700">
          <p>{emptyMessage}</p>
          {(searchParams.get('search') || riskFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'waiting_assignment') && (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchInput('');
                updateParams({ search: null, risk: null, priority: null, status: 'waiting_assignment', page: '1' });
              }}
            >
              Clear all filters
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="hidden w-full text-sm lg:table">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Waiting</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      {renderStudentName(request)}
                      <p className="text-xs text-slate-500">{request.users?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(request.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <VerificationPriorityBadge priority={request.priority} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <VerificationStatusBadge status={request.status} assignedTo={request.assigned_to} />
                        {request.isLocked && <Lock className="h-3 w-3 text-amber-600" aria-label="Locked" />}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">{request.grade_verifications?.risk_level || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{renderAssignee(request)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatWaitingTime(request.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {isAdmin && request.status === 'pending' && staff.length > 0 && (
                          <select
                            className="h-9 rounded-md border border-slate-200 px-2 text-xs"
                            value={request.assigned_to || ''}
                            disabled={assigningId === request.id}
                            onChange={(e) =>
                              handleAssignToStaff(request.id, e.target.value ? e.target.value : null)
                            }
                          >
                            <option value="">Assign…</option>
                            {staff.map((member) => (
                              <option key={member.id} value={member.id}>
                                {(member.full_name || member.email) + ` (${member.roles.join(', ')})`}
                              </option>
                            ))}
                          </select>
                        )}
                        {canClaim(request) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={claimingId === request.id}
                            onClick={() => handleClaim(request.id)}
                          >
                            Claim
                          </Button>
                        )}
                        <Button asChild size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                          <Link href={`/admin/grades/${request.id}`}>Open</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-3 p-4 lg:hidden">
              {requests.map((request) => (
                <div key={request.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {renderStudentName(request)}
                      <p className="text-xs text-slate-500">{request.users?.email}</p>
                    </div>
                    <VerificationStatusBadge status={request.status} assignedTo={request.assigned_to} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <VerificationPriorityBadge priority={request.priority} />
                    <span className="text-xs text-slate-600">Risk: {request.grade_verifications?.risk_level || '—'}</span>
                  </div>
                  <p className="text-xs text-slate-600">{formatWaitingTime(request.created_at)}</p>
                  <Button asChild size="sm" className="mt-3 w-full bg-blue-600 text-white hover:bg-blue-700">
                    <Link href={`/admin/grades/${request.id}`}>Open</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => updateParams({ page: String(pagination.page - 1) })}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => updateParams({ page: String(pagination.page + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
