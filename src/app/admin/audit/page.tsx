'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type AuditLog = {
  id: string;
  action_type: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  created_at: string;
  actor?: { full_name: string | null; email: string | null } | null;
};

const ACTION_FILTERS = [
  { value: 'all', label: 'All actions' },
  { value: 'admin_approved', label: 'Approved' },
  { value: 'admin_rejected', label: 'Rejected' },
  { value: 'review_claimed', label: 'Claimed' },
  { value: 'admin_edited_courses', label: 'Course edits' },
  { value: 'review_takeover', label: 'Takeovers' },
];

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '25', actionType: actionFilter });
      const response = await fetch(`/api/admin/audit?${query}`, { cache: 'no-store', credentials: 'same-origin' });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to load audit logs.');
        return;
      }
      setLogs(result.data.logs || []);
      setTotalPages(result.data.totalPages || 1);
    } catch {
      setError('Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <AdminShell title="Audit Log" description="Append-only record of admin review actions">
      <div className="mb-4 flex flex-wrap gap-2">
        {ACTION_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            size="sm"
            variant={actionFilter === filter.value ? 'default' : 'outline'}
            className={actionFilter === filter.value ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
            onClick={() => {
              setActionFilter(filter.value);
              setPage(1);
            }}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-slate-600">Loading audit logs…</Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card>
      ) : logs.length === 0 ? (
        <Card className="p-6 text-sm text-slate-600">No audit entries found.</Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Transition</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{log.actor?.full_name || log.actor?.email || 'System'}</td>
                  <td className="px-4 py-3">{log.action_type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {log.from_status || '—'} → {log.to_status || '—'}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">{log.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
