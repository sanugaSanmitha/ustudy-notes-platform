'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type ReviewStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'all';

type AdminReviewRequest = {
  id: string;
  issue_type: string;
  message: string | null;
  external_transcript_url?: string | null;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  review_started_at?: string | null;
  created_at: string;
  grade_verifications?: {
    id: string;
    status: string;
    transcript_filename: string | null;
    risk_level: string | null;
    risk_score: number | null;
  } | null;
  users?: {
    full_name: string | null;
    email: string | null;
  } | null;
  reviewer?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

type ReviewStats = {
  pending: number;
  reviewing: number;
  approvedToday: number;
  rejectedToday: number;
};

const STATUS_FILTERS: Array<{ value: ReviewStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

export default function AdminGradeReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<AdminReviewRequest[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>('pending');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/grades/reviews?status=${statusFilter}`, {
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
    } catch (requestError) {
      console.error('Admin review list fetch error:', requestError);
      setError('Unable to load admin review requests right now.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const emptyMessage =
    statusFilter === 'all'
      ? 'No admin review requests found.'
      : `No ${statusFilter} admin review requests.`;

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-5xl px-4 py-8 text-slate-900">
        <h1 className="text-3xl font-bold">Admin Transcript Reviews</h1>
        <p className="mt-2 text-slate-600">Review transcript verification requests requiring manual review.</p>

        {stats && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pending Reviews</p>
              <p className="mt-1 text-2xl font-semibold">{stats.pending}</p>
            </Card>
            <Card className="bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Currently Reviewing</p>
              <p className="mt-1 text-2xl font-semibold">{stats.reviewing}</p>
            </Card>
            <Card className="bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Approved Today</p>
              <p className="mt-1 text-2xl font-semibold">{stats.approvedToday}</p>
            </Card>
            <Card className="bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Rejected Today</p>
              <p className="mt-1 text-2xl font-semibold">{stats.rejectedToday}</p>
            </Card>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              variant={statusFilter === filter.value ? 'default' : 'outline'}
              className={statusFilter === filter.value ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <Card className="mt-6 bg-white p-6 text-sm text-slate-600">Loading review requests...</Card>
        ) : error ? (
          <Card className="mt-6 border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card>
        ) : requests.length === 0 ? (
          <Card className="mt-6 bg-white p-6 text-sm text-slate-700">{emptyMessage}</Card>
        ) : (
          <div className="mt-6 space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      {request.users?.full_name || 'Unknown Student'} ({request.users?.email || 'unknown email'})
                    </p>
                    <p className="text-xs text-slate-500">Issue: {request.issue_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-500">
                      Uploaded: {new Date(request.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      File: {request.grade_verifications?.transcript_filename || 'Transcript.pdf'}
                    </p>
                    <p className="text-xs font-medium capitalize text-slate-600">Status: {request.status}</p>
                    {request.status === 'reviewing' && request.reviewer && (
                      <p className="text-xs text-slate-500">
                        Reviewer: {request.reviewer.full_name || request.reviewer.email || 'Assigned admin'}
                      </p>
                    )}
                    {request.external_transcript_url && (
                      <a
                        href={request.external_transcript_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-xs text-blue-600 hover:underline"
                      >
                        Open user-provided external link
                      </a>
                    )}
                    <p className="text-xs text-slate-500">
                      Risk: {request.grade_verifications?.risk_level || 'unknown'} (
                      {request.grade_verifications?.risk_score ?? 'n/a'})
                    </p>
                  </div>
                  <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                    <Link href={`/admin/grades/${request.id}`}>
                      {request.status === 'approved' || request.status === 'rejected' ? 'View' : 'Open Review'}
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
