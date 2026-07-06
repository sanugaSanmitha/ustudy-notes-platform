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
  creditsAttempted?: number | null;
  creditsEarned?: number | null;
};

type ReviewRow = {
  source: 'ai' | 'user_added';
  rowState: 'green' | 'purple' | 'orange';
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
  review_started_at?: string | null;
  created_at: string;
  grade_verifications?: {
    id: string;
    status: string;
    transcript_filename: string | null;
    parser_source?: string | null;
    extraction_confidence?: number | null;
    parsed_courses: GradeCourse[] | null;
    manual_courses: GradeCourse[] | null;
    review_rows?: ReviewRow[] | null;
    parsed_transcript: Record<string, unknown> | null;
    risk_level: string | null;
    risk_score: number | null;
    risk_reasons: Array<{ code?: string; message?: string; points?: number }> | null;
    transcript_storage_bucket?: string | null;
    transcript_storage_path?: string | null;
  } | null;
  users?: { full_name: string | null; email: string | null } | null;
  reviewer?: { full_name: string | null; email: string | null } | null;
};

type ConfirmAction = 'approve' | 'reject' | null;

export default function AdminGradeReviewDetailPage() {
  const params = useParams<{ requestId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lockedMessage, setLockedMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [request, setRequest] = useState<ReviewPayload | null>(null);
  const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null);
  const [transcriptUrlError, setTranscriptUrlError] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const response = await fetch(`/api/admin/grades/reviews/${params.requestId}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const result = await response.json().catch(() => null);
        if (response.status === 409 && result?.error?.code === 'LOCKED') {
          setLockedMessage(result.error.message || 'This request is already being reviewed.');
          return;
        }
        if (!response.ok) {
          setError(result?.error?.message || 'Failed to load admin review details.');
          return;
        }
        setRequest(result?.data?.request || null);
        setTranscriptUrl(result?.data?.transcriptUrl || null);
        setTranscriptUrlError(result?.data?.transcriptUrlError || null);
        setReadOnly(Boolean(result?.data?.readOnly));
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

  const reviewRows = useMemo(() => {
    return request?.grade_verifications?.review_rows || [];
  }, [request]);

  const courseList = useMemo(() => {
    if (!request?.grade_verifications) {
      return [];
    }
    if (reviewRows.length > 0) {
      return reviewRows;
    }
    return request.grade_verifications.manual_courses || request.grade_verifications.parsed_courses || [];
  }, [request, reviewRows]);

  const riskReasons = request?.grade_verifications?.risk_reasons || [];
  const parsedTranscript = request?.grade_verifications?.parsed_transcript || null;
  const analysis = (parsedTranscript?.analysis as Record<string, unknown>) || {};
  const quality = (analysis.quality as Record<string, unknown>) || {};
  const observations = Array.isArray(analysis.observations) ? analysis.observations : [];

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
      setConfirmAction(null);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-slate-600">Loading review details...</div>;
  }

  if (lockedMessage) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card className="border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-medium">{lockedMessage}</p>
          <p className="mt-2">Return to the dashboard and pick another request.</p>
          <Button asChild className="mt-4 bg-blue-600 text-white hover:bg-blue-700">
            <Link href="/admin/grades">Back to Dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (error && !request) {
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

  const reviewerName = request.reviewer?.full_name || request.reviewer?.email || 'Unassigned';
  const isFinalized = request.status === 'approved' || request.status === 'rejected';

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-5xl px-4 py-8 text-black">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Review Request</h1>
          <Button asChild variant="outline">
            <Link href="/admin/grades">Back to Dashboard</Link>
          </Button>
        </div>

        <Card className="mt-6 bg-white p-6">
          <p className="text-sm font-semibold">
            {request.users?.full_name || 'Unknown Student'} ({request.users?.email || 'unknown email'})
          </p>
          <p className="mt-1 text-sm text-slate-700">Issue: {request.issue_type.replace(/_/g, ' ')}</p>
          <p className="mt-1 text-sm text-slate-700">
            Submitted: {new Date(request.created_at).toLocaleString()}
          </p>
          <p className="mt-1 text-sm capitalize text-slate-700">Status: {request.status}</p>
          <p className="mt-1 text-sm text-slate-700">Reviewer: {reviewerName}</p>
          {request.message && <p className="mt-1 text-sm text-slate-700">Message: {request.message}</p>}
          <p className="mt-1 text-xs text-slate-600">
            Risk: {request.grade_verifications?.risk_level || 'unknown'} (
            {request.grade_verifications?.risk_score ?? 'n/a'})
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
              {courseList.map((course, index) => {
                const rowState = 'rowState' in course ? (course as ReviewRow).rowState : null;
                const rowStyle =
                  rowState === 'purple'
                    ? 'border-violet-300 bg-violet-50'
                    : rowState === 'orange'
                      ? 'border-orange-300 bg-orange-50'
                      : rowState === 'green'
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white';
                return (
                  <li key={`${course.courseCode}-${course.grade}-${index}`} className={`rounded border p-3 text-sm ${rowStyle}`}>
                    {rowState && (
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {rowState === 'green' ? 'Green' : rowState === 'purple' ? 'Purple (Edited)' : 'Orange (User Added)'}
                      </p>
                    )}
                    <p className="font-medium">{course.courseCode}</p>
                    <p className="text-slate-700">{course.courseName || 'Course title unavailable'}</p>
                    {'creditsAttempted' in course || 'creditsEarned' in course ? (
                      <p className="text-slate-700">
                        Credits: {(course as GradeCourse).creditsEarned ?? 'n/a'} / {(course as GradeCourse).creditsAttempted ?? 'n/a'}
                      </p>
                    ) : null}
                    <p className="text-slate-700">Grade: {course.grade}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="mt-6 bg-white p-6">
          <h2 className="text-lg font-semibold">AI Parsing Information</h2>
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            <p>Parser used: {request.grade_verifications?.parser_source || 'unknown'}</p>
            <p>
              Confidence score:{' '}
              {request.grade_verifications?.extraction_confidence != null
                ? `${Math.round(request.grade_verifications.extraction_confidence * 100)}%`
                : 'n/a'}
            </p>
            <p>Text extraction quality: {String(quality.textExtractionQuality || 'unknown')}</p>
            {observations.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {observations.slice(0, 6).map((item, index) => {
                  const observation = item as { message?: string; category?: string; severity?: string };
                  return (
                    <li key={`obs-${index}`}>
                      {observation.severity || 'INFO'} / {observation.category || 'GENERAL'}:{' '}
                      {observation.message || 'No details'}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-slate-600">No AI flags recorded.</p>
            )}
          </div>
        </Card>

        <Card className="mt-6 bg-white p-6">
          <h2 className="text-lg font-semibold">Risk Analysis</h2>
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            <p>
              Risk level: {request.grade_verifications?.risk_level || 'unknown'} (
              {request.grade_verifications?.risk_score ?? 'n/a'})
            </p>
            {riskReasons.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {riskReasons.map((reason, index) => (
                  <li key={`${reason.code || 'reason'}-${index}`}>
                    {reason.code || 'RULE'} (+{reason.points ?? 0}): {reason.message || 'No details'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-600">No triggered risk rules recorded.</p>
            )}
          </div>
        </Card>

        <Card className="mt-6 bg-white p-6">
          <Label htmlFor="admin-notes" className="mb-2 block text-sm font-medium text-slate-700">
            Admin Notes
          </Label>
          <textarea
            id="admin-notes"
            value={adminNotes}
            onChange={(event) => setAdminNotes(event.target.value.slice(0, 1000))}
            placeholder="Optional reviewer notes"
            disabled={saving || readOnly || isFinalized}
            rows={4}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
          <p className="mt-1 text-xs text-slate-500">{adminNotes.length} / 1000</p>

          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

          {!readOnly && !isFinalized ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => setConfirmAction('approve')}
                disabled={saving}
              >
                {saving && confirmAction === 'approve' ? 'Processing...' : 'Approve'}
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => setConfirmAction('reject')}
                disabled={saving}
              >
                {saving && confirmAction === 'reject' ? 'Processing...' : 'Reject'}
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              This request is {request.status}. No further action is required.
            </p>
          )}
        </Card>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-md bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              {confirmAction === 'approve' ? 'Approve Transcript?' : 'Reject Transcript?'}
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              {confirmAction === 'approve'
                ? 'The student will become a verified seller. This action cannot be undone.'
                : 'The student will need to submit another transcript. This action cannot be undone.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setConfirmAction(null)} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="button"
                className={confirmAction === 'approve' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'}
                onClick={() => handleAction(confirmAction)}
                disabled={saving}
              >
                {saving ? 'Processing...' : confirmAction === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
