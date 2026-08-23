'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { WaitingForInfo } from '@/components/student/waiting-for-info';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  getSubmissionTypeLabel,
  getVerificationStatusLabel,
  resolveStudentCourseRows,
  type StudentGradeVerificationSnapshot,
} from '@/lib/grades/student-status';
import { isStudentCancelledVerification } from '@/lib/grades/config';
import { cn } from '@/lib/utils';

type GradeVerificationDetailViewProps = {
  initialSnapshot: StudentGradeVerificationSnapshot;
  title?: string;
  description?: string;
};

const STATUS_STYLES: Record<string, string> = {
  manual_required: 'border-amber-200 bg-amber-50 text-amber-800',
  pending_review: 'border-blue-200 bg-blue-50 text-blue-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
  cancelled: 'border-slate-200 bg-slate-50 text-slate-700',
};

const ROW_STATE_STYLES: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-800',
  purple: 'bg-violet-50 text-violet-800',
  orange: 'bg-orange-50 text-orange-800',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function buildTimeline(snapshot: StudentGradeVerificationSnapshot) {
  const latest = snapshot.latestVerification;
  if (!latest) {
    return [
      { label: 'Submit transcript', complete: false, current: true },
      { label: 'Review', complete: false, current: false },
      { label: 'Decision', complete: false, current: false },
    ];
  }

  const submitted = true;
  const underReview =
    latest.status === 'pending_review' ||
    latest.status === 'manual_required' ||
    Boolean(snapshot.openAdminReview);
  const finalized = latest.status === 'approved' || latest.status === 'rejected';

  return [
    { label: 'Submitted', complete: submitted, current: !underReview && !finalized },
    {
      label: underReview ? 'Under review' : finalized ? 'Reviewed' : 'Review',
      complete: finalized,
      current: underReview,
    },
    {
      label: latest.status === 'approved' ? 'Approved' : latest.status === 'rejected' ? 'Rejected' : 'Decision',
      complete: finalized,
      current: finalized,
    },
  ];
}

export function GradeVerificationDetailView({
  initialSnapshot,
  title = 'Grade Verification',
  description = 'Track your transcript submission, review progress, and verified seller status.',
}: GradeVerificationDetailViewProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/grades/status', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to refresh verification status.');
        return;
      }
      setSnapshot(result.data);
    } catch (refreshError) {
      console.error('Grade verification refresh error:', refreshError);
      setError('Unable to refresh verification status right now.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const latest = snapshot.latestVerification;
  const courses = resolveStudentCourseRows(latest);
  const timeline = buildTimeline(snapshot);
  const statusClass = latest
    ? isStudentCancelledVerification(latest)
      ? STATUS_STYLES.cancelled
      : STATUS_STYLES[latest.status] || 'border-slate-200 bg-slate-50 text-slate-700'
    : '';

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 max-w-2xl text-slate-600">{description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mt-4 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-full p-2', snapshot.isVerifiedSeller ? 'bg-emerald-100' : 'bg-slate-100')}>
              <ShieldCheck className={cn('h-5 w-5', snapshot.isVerifiedSeller ? 'text-emerald-700' : 'text-slate-600')} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Seller status</p>
              <p className="text-lg font-semibold text-slate-900">
                {snapshot.isVerifiedSeller ? 'Verified seller' : 'Not verified yet'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <FileText className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Verified courses</p>
              <p className="text-lg font-semibold text-slate-900">{snapshot.verifiedCourseCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2">
              <Upload className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Daily upload quota</p>
              <p className="text-lg font-semibold text-slate-900">
                {snapshot.uploadsToday} / {snapshot.maxUploadsPerDay}
              </p>
              <p className="text-xs text-slate-500">{snapshot.remainingUploadsToday} remaining today</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Verification progress</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {timeline.map((step, index) => (
            <div key={step.label} className="relative flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                  step.complete
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : step.current
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-300 bg-white text-slate-400'
                )}
              >
                {step.complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </div>
              <div>
                <p className="font-medium text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-500">
                  {step.complete ? 'Complete' : step.current ? 'In progress' : 'Pending'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {snapshot.openAdminReview?.status === 'waiting_student' && snapshot.openAdminReview.studentInfoRequest && (
        <div className="mt-6">
          <WaitingForInfo
            requestId={snapshot.openAdminReview.id}
            reviewerMessage={snapshot.openAdminReview.studentInfoRequest}
            onSubmitted={refresh}
          />
        </div>
      )}

      {!latest ? (
        <Card className="mt-6 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-slate-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">No submission yet</h2>
              <p className="mt-1 text-sm text-slate-600">
                Upload your unofficial transcript to start grade verification and unlock seller features.
              </p>
              <Button asChild className="mt-4 bg-blue-600 text-white hover:bg-blue-700">
                <Link href="/grades/upload">Upload transcript</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card className="mt-6 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Latest submission</h2>
              <span className={cn('rounded-md border px-2.5 py-1 text-xs font-medium', statusClass)}>
                {getVerificationStatusLabel(latest.status, latest.reviewer_note)}
              </span>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Submission type</dt>
                <dd className="mt-1 text-sm text-slate-900">{getSubmissionTypeLabel(latest.submission_type)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Submitted</dt>
                <dd className="mt-1 text-sm text-slate-900">{formatDateTime(latest.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Reviewed</dt>
                <dd className="mt-1 text-sm text-slate-900">{formatDateTime(latest.reviewed_at)}</dd>
              </div>
              {latest.transcript_filename && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Transcript file</dt>
                  <dd className="mt-1 text-sm text-slate-900">{latest.transcript_filename}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Auto approval</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {latest.auto_approval_eligible ? 'Eligible' : 'Requires manual review'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Confirmation</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {latest.confirmation_required ? 'Waiting for your confirmation' : 'Not required'}
                </dd>
              </div>
            </dl>

            {latest.status === 'pending_review' && latest.confirmation_required && (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Review is waiting for your confirmation. Return to the upload page to confirm AI-extracted courses or
                request admin review.
              </div>
            )}

            {latest.notes && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-700">Your notes</p>
                <p className="mt-1 text-sm text-slate-700">{latest.notes}</p>
              </div>
            )}

            {latest.reviewer_note && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-700">Reviewer feedback</p>
                <p className="mt-1 text-sm text-slate-700">{latest.reviewer_note}</p>
              </div>
            )}
          </Card>

          {snapshot.openAdminReview && snapshot.openAdminReview.status !== 'waiting_student' && (
            <Card className="mt-6 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Manual review progress</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Review status</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{snapshot.openAdminReview.statusLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Review opened</dt>
                  <dd className="mt-1 text-sm text-slate-900">{formatDateTime(snapshot.openAdminReview.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Last updated</dt>
                  <dd className="mt-1 text-sm text-slate-900">{formatDateTime(snapshot.openAdminReview.updatedAt)}</dd>
                </div>
                {snapshot.latestQueue && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Queue tier</dt>
                    <dd className="mt-1 text-sm capitalize text-slate-900">{snapshot.latestQueue.queue_tier}</dd>
                  </div>
                )}
              </dl>
            </Card>
          )}

          {courses.length > 0 && (
            <Card className="mt-6 overflow-hidden p-0">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">Submitted courses</h2>
                <p className="mt-1 text-sm text-slate-600">{courses.length} course{courses.length === 1 ? '' : 's'} in this submission.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Course code</th>
                      <th className="px-6 py-3">Course title</th>
                      <th className="px-6 py-3">Grade</th>
                      <th className="px-6 py-3">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => (
                      <tr key={`${course.courseCode}-${course.grade}`} className="border-t border-slate-100">
                        <td className="px-6 py-3 font-medium text-slate-900">{course.courseCode}</td>
                        <td className="px-6 py-3 text-slate-700">{course.courseName || '—'}</td>
                        <td className="px-6 py-3 text-slate-900">{course.grade}</td>
                        <td className="px-6 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                              course.rowState ? ROW_STATE_STYLES[course.rowState] : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {course.sourceLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {snapshot.recentSubmissions.length > 1 && (
            <Card className="mt-6 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Recent submissions</h2>
              <ul className="mt-4 space-y-3">
                {snapshot.recentSubmissions.map((submission) => (
                  <li
                    key={submission.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {getVerificationStatusLabel(submission.status, submission.reviewer_note)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {getSubmissionTypeLabel(submission.submission_type)} · {formatDateTime(submission.created_at)}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {submission.reviewed_at ? `Reviewed ${formatDateTime(submission.reviewed_at)}` : 'Not reviewed yet'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Next steps</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {!snapshot.isVerifiedSeller && (
            <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
              <Link href="/grades/upload">
                {latest ? 'Submit another transcript' : 'Upload transcript'}
              </Link>
            </Button>
          )}
          {latest?.status === 'manual_required' && (
            <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
              <Link href="/grades/upload">Complete manual submission</Link>
            </Button>
          )}
          {latest?.status === 'pending_review' && latest.confirmation_required && (
            <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
              <Link href="/grades/upload">Review AI extracted courses</Link>
            </Button>
          )}
          {snapshot.isVerifiedSeller && (
            <Button asChild variant="outline">
              <Link href="/profile/verified-courses">View verified courses</Link>
            </Button>
          )}
          {snapshot.isVerifiedSeller && snapshot.canReuploadTranscript && (
            <Button asChild variant="outline">
              <Link href="/grades/upload">Re-upload transcript</Link>
            </Button>
          )}
        </div>

        {snapshot.isVerifiedSeller && !snapshot.canReuploadTranscript && snapshot.reuploadCooldownLabel && (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <Clock3 className="h-4 w-4" />
            Re-upload available in {snapshot.reuploadCooldownLabel}
            {snapshot.reuploadAvailableAt ? ` (${formatDateTime(snapshot.reuploadAvailableAt)})` : ''}
          </p>
        )}
      </Card>
    </div>
  );
}
