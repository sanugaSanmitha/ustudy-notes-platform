'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { VerificationStatusBadge } from '@/components/admin/verification-status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SCHOOL_OPTIONS } from '@/lib/profile/constants';
import type { AdminUserListItem, VerificationStatus } from '@/lib/grades/admin-users';

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const VERIFICATION_FILTERS: Array<{ value: VerificationStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All verification' },
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'none', label: 'Not verified' },
];

const SELLER_FILTERS = [
  { value: 'all', label: 'All users' },
  { value: 'seller', label: 'Sellers' },
  { value: 'non-seller', label: 'Non-sellers' },
];

function formatJoinedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const schoolFilter = searchParams.get('school') || 'all';
  const verificationFilter = searchParams.get('verification') || 'all';
  const sellerFilter = searchParams.get('seller') || 'all';
  const joinedFrom = searchParams.get('joinedFrom') || '';
  const joinedTo = searchParams.get('joinedTo') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/admin/users?${params.toString()}`);
    },
    [router, searchParams]
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '25' });
      const search = searchParams.get('search');
      if (search) query.set('search', search);
      if (schoolFilter !== 'all') query.set('school', schoolFilter);
      if (verificationFilter !== 'all') query.set('verification', verificationFilter);
      if (sellerFilter !== 'all') query.set('seller', sellerFilter);
      if (joinedFrom) query.set('joinedFrom', new Date(joinedFrom).toISOString());
      if (joinedTo) query.set('joinedTo', new Date(`${joinedTo}T23:59:59`).toISOString());

      const response = await fetch(`/api/admin/users?${query.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to load users.');
        return;
      }
      setUsers(result.data.users || []);
      setPagination(result.data.pagination || null);
    } catch {
      setError('Unable to load users right now.');
    } finally {
      setLoading(false);
    }
  }, [page, schoolFilter, verificationFilter, sellerFilter, joinedFrom, joinedTo, searchParams]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get('search') || '';
      if (searchInput !== current) {
        updateParams({ search: searchInput || null, page: '1' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, searchParams, updateParams]);

  const emptyMessage = useMemo(() => {
    if (searchParams.get('search') || schoolFilter !== 'all' || verificationFilter !== 'all' || sellerFilter !== 'all') {
      return 'No users match your filters.';
    }
    return 'No users found yet.';
  }, [searchParams, schoolFilter, verificationFilter, sellerFilter]);

  return (
    <AdminShell title="Users" description="Student accounts, verification status, and seller permissions.">
      <Card className="sticky top-16 z-30 mb-4 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email, or ID…"
              className="pl-9"
            />
          </div>
          <select
            value={schoolFilter}
            onChange={(e) => updateParams({ school: e.target.value === 'all' ? null : e.target.value, page: '1' })}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm"
          >
            <option value="all">All schools</option>
            {SCHOOL_OPTIONS.map((school) => (
              <option key={school} value={school}>
                {school}
              </option>
            ))}
          </select>
          <select
            value={verificationFilter}
            onChange={(e) =>
              updateParams({ verification: e.target.value === 'all' ? null : e.target.value, page: '1' })
            }
            className="h-9 rounded-md border border-slate-200 px-3 text-sm"
          >
            {VERIFICATION_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <select
            value={sellerFilter}
            onChange={(e) => updateParams({ seller: e.target.value === 'all' ? null : e.target.value, page: '1' })}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm"
          >
            {SELLER_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={joinedFrom}
            onChange={(e) => updateParams({ joinedFrom: e.target.value || null, page: '1' })}
            className="h-9 w-36"
            aria-label="Joined from"
          />
          <Input
            type="date"
            value={joinedTo}
            onChange={(e) => updateParams({ joinedTo: e.target.value || null, page: '1' })}
            className="h-9 w-36"
            aria-label="Joined to"
          />
        </div>
      </Card>

      {loading ? (
        <Card className="bg-white p-6 text-sm text-slate-600">Loading users…</Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card>
      ) : users.length === 0 ? (
        <Card className="bg-white p-8 text-center text-sm text-slate-700">{emptyMessage}</Card>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="hidden w-full text-sm lg:table">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Courses</th>
                  <th className="px-4 py-3">Requests</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${user.id}`} className="font-medium text-blue-600 hover:underline">
                        {user.fullName || 'Unknown'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600">{user.school || '—'}</td>
                    <td className="px-4 py-3">{user.isSeller ? '✅' : '❌'}</td>
                    <td className="px-4 py-3">
                      <VerificationStatusBadge status={user.verificationStatus} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.verifiedCourseCount}</td>
                    <td className="px-4 py-3 text-slate-600">{user.verificationRequestCount}</td>
                    <td className="px-4 py-3 text-slate-600">{formatJoinedDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/users/${user.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-3 p-4 lg:hidden">
              {users.map((user) => (
                <div key={user.id} className="rounded-lg border border-slate-200 p-4">
                  <Link href={`/admin/users/${user.id}`} className="font-medium text-blue-600 hover:underline">
                    {user.fullName || 'Unknown'}
                  </Link>
                  <p className="text-xs text-slate-500">{user.email}</p>
                  <p className="mt-2 text-xs text-slate-600">{user.school || 'No school'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <VerificationStatusBadge status={user.verificationStatus} />
                    <span className="text-xs text-slate-500">{user.verifiedCourseCount} courses</span>
                    <span className="text-xs text-slate-500">{user.verificationRequestCount} requests</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} users
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
