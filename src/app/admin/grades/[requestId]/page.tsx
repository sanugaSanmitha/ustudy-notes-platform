'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminShell, useAdminPortalRole } from '@/components/admin/admin-shell';
import { StudentReplyPanel } from '@/components/admin/student-reply-panel';
import { VerificationPriorityBadge, VerificationStatusBadge } from '@/components/admin/verification-workflow-badges';
import { GradeTableEditor, type EditableCourseRow } from '@/components/admin/grade-table-editor';
import { PdfViewer } from '@/components/admin/pdf-viewer';
import { ConfidenceSummaryBar } from '@/components/admin/confidence-summary-bar';
import { RiskIndicatorsPanel } from '@/components/admin/risk-indicators-panel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { REJECT_REASON_OPTIONS } from '@/lib/grades/reject-reasons';
import { adminFetch } from '@/lib/api/admin-client';
import { hasHighSeverityRisk } from '@/lib/grades/course-validation';
import { resolveVerificationReviewRows } from '@/lib/grades/review-model';
import { VerificationStatusSummaryBar } from '@/components/admin/verification-status-summary-bar';
import {
  VerificationAnalyticsCharts,
  type VerificationAnalyticsData,
} from '@/components/admin/verification-analytics-charts';
import { ArrowLeft, Lock } from 'lucide-react';

type ReviewPayload = {
  id: string;
  user_id?: string;
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
    submission_type?: string | null;
    review_rows?: EditableCourseRow[] | null;
    parsed_courses: Array<{ courseCode: string; courseName?: string; grade: string }> | null;
    manual_courses: Array<{ courseCode: string; courseName?: string; grade: string }> | null;
    parsed_transcript: Record<string, unknown> | null;
    risk_level: string | null;
    risk_score: number | null;
    risk_reasons: Array<{ code?: string; message?: string; points?: number }> | null;
  } | null;
  users?: { full_name: string | null; email: string | null } | null;
  reviewer?: { full_name: string | null; email: string | null } | null;
  priority?: string | null;
  assigned_to?: string | null;
  reassignment_reason?: string | null;
  reassignment_requested_at?: string | null;
  student_info_request?: string | null;
  updated_at?: string | null;
};

type ConfirmAction = 'approve' | 'reject' | null;

function normalizeRows(request: ReviewPayload | null): EditableCourseRow[] {
  if (!request?.grade_verifications) return [];
  return resolveVerificationReviewRows(request.grade_verifications).map((row, index) => ({
    id: row.id || `row-${index}`,
    source: row.source === 'user_added' ? 'user_added' : 'ai',
    rowState: row.rowState || (row.source === 'user_added' ? 'orange' : 'green'),
    edited: Boolean(row.edited),
    confidence: row.confidence ?? null,
    courseCode: row.courseCode || '',
    courseName: row.courseName || '',
    grade: row.grade || '',
  }));
}

export default function AdminGradeReviewDetailPage() {
  const params = useParams<{ requestId: string }>();
  const router = useRouter();
  const { isAdmin } = useAdminPortalRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [request, setRequest] = useState<ReviewPayload | null>(null);
  const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null);
  const [transcriptUrlError, setTranscriptUrlError] = useState<string | null>(null);
  const [courseRows, setCourseRows] = useState<EditableCourseRow[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [mobileTab, setMobileTab] = useState<'transcript' | 'details'>('transcript');
  const [acknowledgeHighRisk, setAcknowledgeHighRisk] = useState(false);
  const [successNextId, setSuccessNextId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [staff, setStaff] = useState<Array<{ id: string; full_name: string | null; email: string; roles: string[] }>>([]);
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [reassignmentReason, setReassignmentReason] = useState('');
  const [infoRequestMessage, setInfoRequestMessage] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('normal');
  const [studentReplies, setStudentReplies] = useState<
    Array<{ id: string; message: string; files?: Array<{ name?: string }> | null; created_at: string }>
  >([]);
  const [analytics, setAnalytics] = useState<VerificationAnalyticsData | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
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
      const payload = result?.data?.request || null;
      setRequest(payload);
      setTranscriptUrl(result?.data?.transcriptUrl || null);
      setTranscriptUrlError(result?.data?.transcriptUrlError || null);
      setReadOnly(Boolean(result?.data?.readOnly));
      setLockedBy(result?.data?.lockedBy || null);
      setStudentReplies(result?.data?.studentReplies || []);
      setAdminNotes(payload?.admin_notes || '');
      setCourseRows(normalizeRows(payload));
      setSelectedPriority(payload?.priority || 'normal');
    } catch (detailError) {
      console.error('Admin review detail fetch error:', detailError);
      setError('Unable to load admin review details.');
    } finally {
      setLoading(false);
    }
  }, [params.requestId]);

  useEffect(() => {
    if (params.requestId) fetchDetail();
  }, [params.requestId, fetchDetail]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/admin/staff/assistants', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.json())
      .then((result) => setStaff(result?.data?.staff || result?.data?.assistants || []))
      .catch(() => null);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/admin/dashboard', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.json())
      .then((result) => setAnalytics(result?.data?.analytics || null))
      .catch(() => null);
  }, [isAdmin]);

  const runWorkflowAction = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    setWorkflowMessage('');
    try {
      const response = await adminFetch(`/api/admin/grades/reviews/${params.requestId}/workflow`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Workflow action failed.');
        return;
      }
      setWorkflowMessage('Updated successfully.');
      await fetchDetail();
    } finally {
      setSaving(false);
    }
  };

  const handleRequestReassignment = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await adminFetch(`/api/admin/grades/reviews/${params.requestId}/reassignment`, {
        method: 'POST',
        body: JSON.stringify({ reason: reassignmentReason.trim() }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to request reassignment.');
        return;
      }
      setReassignmentReason('');
      await fetchDetail();
    } finally {
      setSaving(false);
    }
  };

  const isFinalized = request?.status === 'approved' || request?.status === 'rejected';

  useEffect(() => {
    if (readOnly || isFinalized) return undefined;

    const heartbeat = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      await adminFetch(`/api/admin/grades/reviews/${params.requestId}/heartbeat`, { method: 'POST' });
    }, 90_000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !readOnly) {
        adminFetch(`/api/admin/grades/reviews/${params.requestId}/heartbeat`, { method: 'POST' });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
      if (!readOnly) {
        adminFetch(`/api/admin/grades/reviews/${params.requestId}/release`, { method: 'POST' }).catch(() => null);
      }
    };
  }, [params.requestId, readOnly, isFinalized]);

  const riskReasons = request?.grade_verifications?.risk_reasons || [];
  const isHighRisk = hasHighSeverityRisk(request?.grade_verifications?.risk_level);
  const hasInvalidRows = courseRows.some((row) => !row.courseCode.trim() || !row.grade.trim());

  const handleSaveCourses = useCallback(
    async (rows: EditableCourseRow[]) => {
      const response = await adminFetch(`/api/admin/grades/reviews/${params.requestId}/courses`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewRows: rows }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Failed to save course changes.');
      }
      setCourseRows(result?.data?.reviewRows || rows);
    },
    [params.requestId]
  );

  const handleTakeover = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await adminFetch(`/api/admin/grades/reviews/${params.requestId}/takeover`, { method: 'POST' });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Takeover failed.');
        return;
      }
      await fetchDetail();
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    setSaving(true);
    setError('');
    try {
      const response = await adminFetch(`/api/admin/grades/reviews/${params.requestId}`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          adminNotes: adminNotes.trim() || undefined,
          rejectReason: action === 'reject' ? rejectReason : undefined,
          rejectComment: action === 'reject' ? rejectComment.trim() : undefined,
          acknowledgeHighRisk: action === 'approve' ? acknowledgeHighRisk : undefined,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || `Failed to ${action} review.`);
        return;
      }
      if (action === 'approve') {
        setSuccessNextId(result?.data?.nextPendingId || null);
        setShowSuccess(true);
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

  const studentName = request?.users?.full_name || 'Unknown Student';

  const detailsPane = (
      <div className="space-y-4">
        <VerificationStatusSummaryBar
          requestId={request?.id || params.requestId}
          status={request?.status || 'pending'}
          priority={request?.priority}
          createdAt={request?.created_at || new Date().toISOString()}
          reviewStartedAt={request?.review_started_at}
          assignedTo={request?.assigned_to}
          reviewerName={request?.reviewer?.full_name || request?.reviewer?.email || null}
          updatedAt={request?.updated_at}
        />

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <VerificationStatusBadge status={request?.status || 'pending'} assignedTo={request?.assigned_to} />
            <VerificationPriorityBadge priority={request?.priority} />
            {request?.reviewer?.full_name && (
              <span className="text-xs text-slate-600">Reviewer: {request.reviewer.full_name}</span>
            )}
          </div>
          {request?.reassignment_reason && (
            <p className="mt-2 text-xs text-amber-800">Reassignment requested: {request.reassignment_reason}</p>
          )}
          {request?.student_info_request && (
            <p className="mt-2 text-xs text-blue-800">Waiting for student: {request.student_info_request}</p>
          )}
        </Card>

        <StudentReplyPanel replies={studentReplies} />

        {!readOnly && !isFinalized && (
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-slate-900">Workflow</h2>
            {workflowMessage && <p className="mt-1 text-xs text-emerald-700">{workflowMessage}</p>}
            {!isAdmin && request?.status === 'reviewing' && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={infoRequestMessage}
                  onChange={(e) => setInfoRequestMessage(e.target.value.slice(0, 1000))}
                  placeholder="Message to student when requesting more information…"
                  rows={2}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving || infoRequestMessage.trim().length < 10}
                    onClick={() => runWorkflowAction({ action: 'request_info', message: infoRequestMessage.trim() })}
                  >
                    Request More Info
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving || reassignmentReason.trim().length < 10}
                    onClick={handleRequestReassignment}
                  >
                    Request Reassignment
                  </Button>
                </div>
                <textarea
                  value={reassignmentReason}
                  onChange={(e) => setReassignmentReason(e.target.value.slice(0, 1000))}
                  placeholder="Reason for reassignment request…"
                  rows={2}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            )}
            {isAdmin && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="h-9 rounded-md border border-slate-200 px-2 text-sm"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                  <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => runWorkflowAction({ action: 'change_priority', priority: selectedPriority })}>
                    Change Priority
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => runWorkflowAction({ action: 'escalate' })}>
                    Escalate
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => runWorkflowAction({ action: 'take' })}>
                    Take
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => runWorkflowAction({ action: 'remove_assignment' })}>
                    Remove Assignment
                  </Button>
                </div>
                {request?.status === 'pending_reassignment' && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" disabled={saving} onClick={() => runWorkflowAction({ action: 'resolve_reassignment', decision: 'reject' })}>
                      Deny Reassignment
                    </Button>
                    <select
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="h-9 rounded-md border border-slate-200 px-2 text-sm"
                    >
                      <option value="">Reassign to…</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving || !selectedAssignee}
                      onClick={() =>
                        runWorkflowAction({
                          action: 'resolve_reassignment',
                          decision: 'approve',
                          newAssigneeUserId: selectedAssignee,
                        })
                      }
                    >
                      Approve Reassignment
                    </Button>
                  </div>
                )}
                {request?.status !== 'pending_reassignment' && staff.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="h-9 rounded-md border border-slate-200 px-2 text-sm"
                    >
                      <option value="">Assign / Reassign…</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={saving || !selectedAssignee}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const response = await adminFetch(`/api/admin/grades/reviews/${params.requestId}/assign`, {
                            method: 'POST',
                            body: JSON.stringify({ assigneeUserId: selectedAssignee }),
                          });
                          const result = await response.json().catch(() => null);
                          if (!response.ok) {
                            setError(result?.error?.message || 'Assign failed.');
                            return;
                          }
                          await fetchDetail();
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Assign
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">Student</h2>
          {request?.user_id ? (
            <Link href={`/admin/users/${request.user_id}`} className="mt-1 inline-block text-sm font-medium text-blue-600 hover:underline">
              {studentName}
            </Link>
          ) : (
            <p className="mt-1 text-sm text-slate-700">{studentName}</p>
          )}
          <p className="text-sm text-slate-500">{request?.users?.email}</p>
          <p className="mt-2 text-xs text-slate-500">
            Issue: {request?.issue_type.replace(/_/g, ' ')} · Submitted {request ? new Date(request.created_at).toLocaleString() : ''}
          </p>
          {request?.message && <p className="mt-1 text-xs text-slate-600">Student message: {request.message}</p>}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">Risk Analysis</h2>
          <div className="mt-2">
            <RiskIndicatorsPanel
              riskLevel={request?.grade_verifications?.risk_level || null}
              riskScore={request?.grade_verifications?.risk_score ?? null}
              reasons={riskReasons}
            />
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Confidence Summary</h2>
          <ConfidenceSummaryBar rows={courseRows} />
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Course grades</h2>
            {request?.grade_verifications?.submission_type === 'manual' && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                Student manual entry
              </span>
            )}
          </div>
          <GradeTableEditor
            rows={courseRows}
            readOnly={readOnly || isFinalized}
            onChange={setCourseRows}
            onSave={handleSaveCourses}
          />
        </Card>

        {!readOnly && !isFinalized && (
          <Card className="p-4">
            <Label htmlFor="admin-notes" className="text-sm font-medium text-slate-700">
              Internal admin notes (optional)
            </Label>
            <textarea
              id="admin-notes"
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value.slice(0, 1000))}
              placeholder="Optional internal notes"
              rows={3}
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Card>
        )}

        {isAdmin && analytics && (
          <VerificationAnalyticsCharts data={analytics} title="Queue Analytics" compact />
        )}
      </div>
    );

  if (loading) {
    return (
      <AdminShell title="Review Request" description="Loading…">
        <Card className="p-6 text-sm text-slate-600">Loading review details…</Card>
      </AdminShell>
    );
  }

  if (error && !request) {
    return (
      <AdminShell title="Review Request">
        <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card>
      </AdminShell>
    );
  }

  if (!request) {
    return (
      <AdminShell title="Review Request">
        <Card className="p-6 text-sm text-slate-700">Review request not found.</Card>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={studentName}
      description={`Transcript review · ${request.status.replace(/_/g, ' ')}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/grades">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to queue
            </Link>
          </Button>
          {!readOnly && !isFinalized && (
            <>
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={saving || hasInvalidRows}
                onClick={() => setConfirmAction('approve')}
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={saving}
                onClick={() => setConfirmAction('reject')}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      }
    >
      {readOnly && lockedBy && !isFinalized && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0" />
            <p>
              <strong>{lockedBy}</strong> is currently reviewing this request. You can view everything but cannot edit
              until they finish.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={handleTakeover} disabled={saving}>
            Take over
          </Button>
        </Card>
      )}

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      <div className="mb-4 flex gap-2 lg:hidden">
        <Button
          type="button"
          size="sm"
          variant={mobileTab === 'transcript' ? 'default' : 'outline'}
          onClick={() => setMobileTab('transcript')}
        >
          Transcript
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mobileTab === 'details' ? 'default' : 'outline'}
          onClick={() => setMobileTab('details')}
        >
          Details
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className={`lg:col-span-5 ${mobileTab === 'details' ? 'hidden lg:block' : ''}`}>
          <PdfViewer
            url={transcriptUrl}
            filename={request.grade_verifications?.transcript_filename}
            error={transcriptUrlError}
            onRetry={fetchDetail}
          />
          {request.external_transcript_url && (
            <a
              href={request.external_transcript_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-blue-600 hover:underline"
            >
              Open user-provided external link
            </a>
          )}
        </div>
        <div className={`lg:col-span-7 ${mobileTab === 'transcript' ? 'hidden lg:block' : ''}`}>{detailsPane}</div>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-md bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              {confirmAction === 'approve' ? 'Approve Transcript?' : 'Reject Transcript?'}
            </h3>
            {confirmAction === 'approve' ? (
              <div className="mt-2 space-y-3">
                <p className="text-sm text-slate-700">
                  {studentName} will become a verified seller with {courseRows.length} verified course
                  {courseRows.length === 1 ? '' : 's'}. This cannot be undone.
                </p>
                {isHighRisk && (
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={acknowledgeHighRisk}
                      onChange={(e) => setAcknowledgeHighRisk(e.target.checked)}
                      className="mt-1"
                    />
                    I have reviewed the flagged high-risk issues and confirm this transcript is ready to approve.
                  </label>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="reject-reason">Reason</Label>
                  <select
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select a reason…</option>
                    {REJECT_REASON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="reject-comment">Comment for student (min 10 chars)</Label>
                  <textarea
                    id="reject-comment"
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value.slice(0, 1000))}
                    rows={4}
                    placeholder="This note will be shared with the student — keep it clear and professional."
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setConfirmAction(null)} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="button"
                className={
                  confirmAction === 'approve'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }
                onClick={() => handleAction(confirmAction)}
                disabled={
                  saving ||
                  (confirmAction === 'reject' && (!rejectReason || rejectComment.trim().length < 10)) ||
                  (confirmAction === 'approve' && isHighRisk && !acknowledgeHighRisk)
                }
              >
                {saving ? 'Processing…' : confirmAction === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="alertdialog" aria-modal="true">
          <Card className="w-full max-w-md bg-white p-6">
            <h3 className="text-lg font-semibold text-emerald-700">Approved</h3>
            <p className="mt-2 text-sm text-slate-700">{studentName}&apos;s transcript has been finalized.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => router.push('/admin/grades')}>
                Back to queue
              </Button>
              {successNextId && (
                <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => router.push(`/admin/grades/${successNextId}`)}>
                  Review next pending
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
