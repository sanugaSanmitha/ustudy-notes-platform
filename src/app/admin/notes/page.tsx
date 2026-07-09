'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, RefreshCw, Search } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { StatCard } from '@/components/admin/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AdminNoteListItem, AdminNoteListingStats, NoteListingStatus } from '@/lib/notes/admin-notes';
import { cn } from '@/lib/utils';

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const STATUS_FILTERS: Array<{ value: NoteListingStatus | 'all'; label: string }> = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All Listings' },
];

function statusBadgeClass(status: NoteListingStatus) {
  switch (status) {
    case 'pending_review':
      return 'bg-amber-100 text-amber-800';
    case 'published':
      return 'bg-emerald-100 text-emerald-800';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function statusLabel(status: NoteListingStatus) {
  switch (status) {
    case 'pending_review':
      return 'Pending Review';
    case 'published':
      return 'Published';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
}

export default function AdminNotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [listings, setListings] = useState<AdminNoteListItem[]>([]);
  const [stats, setStats] = useState<AdminNoteListingStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const statusFilter = (searchParams.get('status') || 'pending_review') as NoteListingStatus | 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/admin/notes?${params.toString()}`);
    },
    [router, searchParams]
  );

  const fetchListings = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: '25',
          status: statusFilter,
          stats: '1',
        });
        const search = searchParams.get('search');
        if (search) query.set('search', search);

        const response = await fetch(`/api/admin/notes?${query.toString()}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const result = await response.json();

        if (!response.ok) {
          setError(result?.error?.message || 'Failed to load note listings.');
          return;
        }

        setListings(result?.data?.listings || []);
        setPagination(result?.data?.pagination || null);
        setStats(result?.data?.stats || null);
      } catch {
        setError('Unable to load note listings.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, searchParams, statusFilter]
  );

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  const emptyMessage = useMemo(() => {
    if (searchParams.get('search') || statusFilter !== 'pending_review') {
      return 'No listings match your filters.';
    }
    return 'No note listings are waiting for review.';
  }, [searchParams, statusFilter]);

  return (
    <AdminShell
      title="Note Listings"
      description="Review seller note submissions, preview ZIP contents, and publish or reject listings."
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => fetchListings(true)} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {error && <Card className="mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Pending Review"
            value={stats.pending}
            accent="amber"
            onClick={() => updateParams({ status: 'pending_review', page: '1' })}
          />
          <StatCard
            label="Published"
            value={stats.published}
            accent="green"
            onClick={() => updateParams({ status: 'published', page: '1' })}
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            accent="red"
            onClick={() => updateParams({ status: 'rejected', page: '1' })}
          />
          <StatCard label="Published Today" value={stats.publishedToday} accent="green" />
          <StatCard label="Rejected Today" value={stats.rejectedToday} accent="neutral" />
        </div>
      )}

      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="note-search" className="mb-1 block text-xs font-medium text-slate-600">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="note-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    updateParams({ search: searchInput.trim() || null, page: '1' });
                  }
                }}
                placeholder="Course code, title, or filename"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label htmlFor="status-filter" className="mb-1 block text-xs font-medium text-slate-600">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => updateParams({ status: event.target.value, page: '1' })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={() => updateParams({ search: searchInput.trim() || null, page: '1' })}>
            Apply
          </Button>
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-slate-600">Loading note listings...</p>
      ) : listings.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-600">{emptyMessage}</Card>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <Card
              key={listing.id}
              className={cn(
                'border p-4',
                listing.status === 'pending_review'
                  ? 'border-amber-200 bg-amber-50/40'
                  : listing.status === 'published'
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-200'
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{listing.title}</p>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusBadgeClass(listing.status))}>
                      {statusLabel(listing.status)}
                    </span>
                    <span className="text-xs text-slate-500">{listing.courseCode}</span>
                    {listing.verifiedGrade && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Grade {listing.verifiedGrade}
                      </span>
                    )}
                  </div>

                  {listing.courseTitle && <p className="text-sm text-slate-600">{listing.courseTitle}</p>}

                  <p className="mt-1 text-sm text-slate-600">
                    {listing.userName || 'Unknown seller'}
                    {listing.userEmail ? ` · ${listing.userEmail}` : ''}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {listing.semester} {listing.academicYear} · HK${listing.priceHkd.toFixed(0)} ·{' '}
                    {listing.fileCount} file{listing.fileCount === 1 ? '' : 's'} · Submitted{' '}
                    {new Date(listing.createdAt).toLocaleString()}
                  </p>

                  {listing.materialTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {listing.materialTags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {listing.fileNames.length > 0 && (
                    <div className="mt-3 rounded-md border border-slate-200 bg-white/80 p-3">
                      <p className="text-xs font-medium text-slate-700">
                        ZIP preview ({listing.fileNames.length} files)
                      </p>
                      <ul className="mt-2 max-h-20 space-y-1 overflow-y-auto text-xs text-slate-600">
                        {listing.fileNames.slice(0, 6).map((name) => (
                          <li key={name} className="truncate">
                            • {name}
                          </li>
                        ))}
                        {listing.fileNames.length > 6 && (
                          <li className="text-slate-400">+ {listing.fileNames.length - 6} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <Button asChild size="sm">
                    <Link href={`/admin/notes/${listing.id}`}>
                      {listing.status === 'pending_review' ? 'Review' : 'View'}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/users/${listing.userId}`}>View Seller</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
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

      {!loading && listings.length > 0 && (
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <BookOpen className="size-4" />
          Approved listings appear on the homepage and course marketplace pages.
        </p>
      )}
    </AdminShell>
  );
}
