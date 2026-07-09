'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, FileArchive, Search } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AdminMaterialListItem } from '@/lib/materials/admin-materials';
import { cn } from '@/lib/utils';

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const LOCK_FILTERS = [
  { value: 'all', label: 'All materials' },
  { value: 'unlocked', label: 'Unlocked (re-upload window)' },
  { value: 'locked', label: 'Locked' },
] as const;

export default function AdminMaterialsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [materials, setMaterials] = useState<AdminMaterialListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const lockedFilter = searchParams.get('locked') || 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/admin/materials?${params.toString()}`);
    },
    [router, searchParams]
  );

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '25' });
      const search = searchParams.get('search');
      if (search) query.set('search', search);
      if (lockedFilter !== 'all') query.set('locked', lockedFilter);

      const response = await fetch(`/api/admin/materials?${query.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message || 'Failed to load materials.');
        return;
      }

      setMaterials(result?.data?.materials || []);
      setPagination(result?.data?.pagination || null);
    } catch {
      setError('Unable to load materials.');
    } finally {
      setLoading(false);
    }
  }, [lockedFilter, page, searchParams]);

  useEffect(() => {
    void fetchMaterials();
  }, [fetchMaterials]);

  const handleDownload = async (materialId: string) => {
    setDownloadingId(materialId);
    setError('');
    try {
      const response = await fetch(`/api/admin/materials/${materialId}/download`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        setError(result?.error?.message || 'Download failed.');
        return;
      }
      if (result?.data?.downloadUrl) {
        window.open(result.data.downloadUrl, '_blank');
      }
      await fetchMaterials();
    } catch {
      setError('Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <AdminShell
      title="Course Materials"
      description="Review uploaded seller materials, ZIP previews, and download activity."
    >
      {error && <Card className="mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="material-search" className="mb-1 block text-xs font-medium text-slate-600">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="material-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    updateParams({ search: searchInput.trim() || null, page: '1' });
                  }
                }}
                placeholder="Course code, name, or filename"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label htmlFor="lock-filter" className="mb-1 block text-xs font-medium text-slate-600">
              Status
            </label>
            <select
              id="lock-filter"
              value={lockedFilter}
              onChange={(event) => updateParams({ locked: event.target.value === 'all' ? null : event.target.value, page: '1' })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {LOCK_FILTERS.map((filter) => (
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
        <p className="text-sm text-slate-600">Loading materials...</p>
      ) : materials.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-600">No materials found.</Card>
      ) : (
        <div className="space-y-3">
          {materials.map((material) => (
            <Card
              key={material.id}
              className={cn(
                'border p-4',
                material.isLocked ? 'border-red-200 bg-red-50/40' : 'border-sky-200 bg-sky-50/40'
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{material.courseCode}</p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        material.isLocked ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'
                      )}
                    >
                      {material.isLocked ? 'Locked' : 'Unlocked'}
                    </span>
                    <span className="text-xs text-slate-500">Grade {material.grade} · v{material.version}</span>
                  </div>
                  <p className="text-sm text-slate-600">{material.courseName}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {material.userName || 'Unknown user'}
                    {material.userEmail ? ` · ${material.userEmail}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {material.zipFilename} · {(material.zipSizeBytes / 1024 / 1024).toFixed(2)} MB ·{' '}
                    {material.downloadCount} download(s) · Uploaded {new Date(material.uploadedAt).toLocaleString()}
                  </p>
                  {material.zipFileNames.length > 0 && (
                    <div className="mt-3 rounded-md border border-slate-200 bg-white/80 p-3">
                      <p className="text-xs font-medium text-slate-700">
                        ZIP preview ({material.zipFileNames.length} files)
                      </p>
                      <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-slate-600">
                        {material.zipFileNames.slice(0, 8).map((name) => (
                          <li key={name} className="truncate">
                            • {name}
                          </li>
                        ))}
                        {material.zipFileNames.length > 8 && (
                          <li className="text-slate-400">+ {material.zipFileNames.length - 8} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/users/${material.userId}`}>View User</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleDownload(material.id)}
                    disabled={downloadingId === material.id}
                  >
                    <Download className="mr-1 size-4" />
                    {downloadingId === material.id ? 'Preparing...' : 'Download'}
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

      {!loading && materials.length > 0 && (
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <FileArchive className="size-4" />
          Downloads are tracked for analytics and audit purposes.
        </p>
      )}
    </AdminShell>
  );
}
