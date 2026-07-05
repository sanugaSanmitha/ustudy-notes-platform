'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type AdminReviewRequest = {
  id: string;
  issue_type: string;
  message: string | null;
  external_transcript_url?: string | null;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
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
};

export default function AdminGradeReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<AdminReviewRequest[]>([]);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch('/api/admin/grades/reviews?status=pending', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setError(result?.error?.message || 'Failed to load admin review requests.');
          return;
        }
        setRequests(result?.data?.requests || []);
      } catch (requestError) {
        console.error('Admin review list fetch error:', requestError);
        setError('Unable to load admin review requests right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-5xl px-4 py-8 text-slate-900">
      <h1 className="text-3xl font-bold">Admin Transcript Reviews</h1>
      <p className="mt-2 text-slate-600">Review pending manual transcript verification requests.</p>

      {loading ? (
        <Card className="mt-6 bg-white p-6 text-sm text-slate-600">Loading review requests...</Card>
      ) : error ? (
        <Card className="mt-6 border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card>
      ) : requests.length === 0 ? (
        <Card className="mt-6 bg-white p-6 text-sm text-slate-700">No pending admin review requests.</Card>
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
                  <Link href={`/admin/grades/${request.id}`}>Open Review</Link>
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
