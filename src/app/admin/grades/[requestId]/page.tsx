'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type GradeCourse = {
  courseCode: string;
  courseName?: string;
  grade: string;
};

type ReviewPayload = {
  id: string;
  issue_type: string;
  message: string | null;
  external_transcript_url?: string | null;
  status: string;
  admin_notes: string | null;
  grade_verifications?: {
    id: string;
    status: string;
    transcript_filename: string | null;
    parsed_courses: GradeCourse[] | null;
    manual_courses: GradeCourse[] | null;
    parsed_transcript: Record<string, unknown> | null;
    risk_level: string | null;
    risk_score: number | null;
    risk_reasons: Array<{ code?: string; message?: string; points?: number }> | null;
    transcript_storage_bucket?: string | null;
    transcript_storage_path?: string | null;
  } | null;
  users?: { full_name: string | null; email: string | null } | null;
};

export default function AdminGradeReviewDetailPage() {
  const params = useParams<{ requestId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [request, setRequest] = useState<ReviewPayload | null>(null);
  const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null);
  const [transcriptUrlError, setTranscriptUrlError] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const response = await fetch(`/api/admin/grades/reviews/${params.requestId}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setError(result?.error?.message || 'Failed to load admin review details.');
          return;
        }
        setRequest(result?.data?.request || null);
        setTranscriptUrl(result?.data?.transcriptUrl || null);
        setTranscriptUrlError(result?.data?.transcriptUrlError || null);
        setAdminNotes(result?.data?.request?.admin_notes || '');
      } catch (detailError) {
        console.error('Admin review detail fetch error:', detailError);
        setError('Unable to load admin review details.');
      } finally {
        setLoading(false);
      }
    };

    if (params.requestId) {
      fetchDetail();
    }
  }, [params.requestId]);

  const courseList = useMemo(() => {
    if (!request?.grade_verifications) {
      return [];
    }
    return request.grade_verifications.manual_courses || request.grade_verifications.parsed_courses || [];
  }, [request]);

  const handleAction = async (action: 'approve' | 'reject') => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/grades/reviews/${params.requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNotes: adminNotes.trim() || undefined }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || `Failed to ${action} review.`);
        return;
      }
      router.push('/admin/grades');
      router.refresh();
    } catch (actionError) {
      console.error('Admin review action error:', actionError);
      setError(`Unable to ${action} this request right now.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-slate-600">Loading review details...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card className="p-6 text-sm text-slate-700">Review request not found.</Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-5xl px-4 py-8 text-black">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Review Request</h1>
        <Button asChild variant="outline">
          <Link href="/admin/grades">Back to Pending List</Link>
        </Button>
      </div>

      <Card className="mt-6 bg-white p-6">
        <p className="text-sm font-semibold">
          {request.users?.full_name || 'Unknown Student'} ({request.users?.email || 'unknown email'})
        </p>
        <p className="mt-1 text-sm text-slate-700">Issue: {request.issue_type.replace(/_/g, ' ')}</p>
        {request.message && <p className="mt-1 text-sm text-slate-700">Message: {request.message}</p>}
        <p className="mt-1 text-xs text-slate-600">
          Risk: {request.grade_verifications?.risk_level || 'unknown'} ({request.grade_verifications?.risk_score ?? 'n/a'})
        </p>
      </Card>

      <Card className="mt-6 bg-white p-6">
        <h2 className="text-lg font-semibold">Transcript</h2>
        {transcriptUrl ? (
          <a
            href={transcriptUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            Open stored transcript PDF
          </a>
        ) : (
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            <p>Stored transcript file is unavailable.</p>
            {transcriptUrlError && <p>Reason: {transcriptUrlError}</p>}
          </div>
        )}
        {request.external_transcript_url && (
          <a
            href={request.external_transcript_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            Open user-provided external transcript link
          </a>
        )}
      </Card>

      <Card className="mt-6 bg-white p-6">
        <h2 className="text-lg font-semibold">Extracted Courses</h2>
        {courseList.length === 0 ? (
          <p className="mt-2 text-sm text-slate-700">No extracted courses.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {courseList.map((course) => (
              <li key={`${course.courseCode}-${course.grade}`} className="rounded border border-slate-200 p-3 text-sm">
                <p className="font-medium">{course.courseCode}</p>
                <p className="text-slate-700">{course.courseName || 'Course title unavailable'}</p>
                <p className="text-slate-700">Grade: {course.grade}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-6 bg-white p-6">
        <Label htmlFor="admin-notes" className="mb-2 block text-sm font-medium text-slate-700">
          Admin Notes
        </Label>
        <Input
          id="admin-notes"
          value={adminNotes}
          onChange={(event) => setAdminNotes(event.target.value)}
          placeholder="Optional reviewer notes"
          disabled={saving}
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => handleAction('approve')}
            disabled={saving}
          >
            Approve
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => handleAction('reject')}
            disabled={saving}
          >
            Reject
          </Button>
        </div>
      </Card>
      </div>
    </div>
  );
}
