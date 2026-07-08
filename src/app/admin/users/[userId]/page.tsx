'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { VerificationStatusBadge } from '@/components/admin/verification-status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { VerificationStatus } from '@/lib/grades/admin-users';

type UserDetailData = {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    school: string | null;
    anonymousId: string | null;
    isSeller: boolean;
    profileCompleted: boolean;
    verificationStatus: VerificationStatus;
    createdAt: string;
    updatedAt: string;
    emailVerified: boolean;
    lastLoginAt: string | null;
    verifiedSince: string | null;
    lastTranscriptUploadAt: string | null;
  };
  stats: {
    submitted: number;
    approved: number;
    rejected: number;
    pending: number;
    adminReviews: number;
  };
  verifiedCourses: Array<{
    id: string;
    courseCode: string;
    courseName: string | null;
    grade: string;
    semester: string | null;
    academicYear: string | null;
    verifiedAt: string;
    canUploadNotes: boolean;
  }>;
  verificationHistory: Array<{
    id: string;
    requestNumber: number;
    submittedAt: string;
    status: string;
    aiConfidence: number | null;
    riskLevel: string | null;
    reviewerName: string | null;
    adminReviewId: string | null;
    adminReviewStatus: string | null;
    transcriptFilename: string | null;
  }>;
  pendingReviewId: string | null;
  timeline: Array<{
    id: string;
    action_type: string;
    from_status: string | null;
    to_status: string | null;
    notes: string | null;
    created_at: string;
    actor?: { full_name: string | null; email: string | null } | null;
  }>;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatConfidence(value: number | null) {
  if (value == null) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function formatTimelineLabel(actionType: string) {
  return actionType.replace(/_/g, ' ');
}

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<UserDetailData | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/users/${params.userId}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to load user details.');
        return;
      }
      setData(result.data);
    } catch {
      setError('Unable to load user details right now.');
    } finally {
      setLoading(false);
    }
  }, [params.userId]);

  useEffect(() => {
    if (params.userId) fetchDetail();
  }, [params.userId, fetchDetail]);

  if (loading) {
    return (
      <AdminShell title="User" description="Loading account details…">
        <Card className="p-6 text-sm text-slate-600">Loading user…</Card>
      </AdminShell>
    );
  }

  if (error || !data) {
    return (
      <AdminShell title="User">
        <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">{error || 'User not found.'}</Card>
      </AdminShell>
    );
  }

  const { user, stats, verifiedCourses, verificationHistory, pendingReviewId, timeline } = data;

  return (
    <AdminShell
      title={user.fullName || 'Unknown User'}
      description={user.email}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to users
            </Link>
          </Button>
          {pendingReviewId && (
            <Button asChild size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
              <Link href={`/admin/grades/${pendingReviewId}`}>Review pending request</Link>
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{user.fullName || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">HKUST Email</dt>
              <dd className="text-slate-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Platform ID</dt>
              <dd className="text-slate-900">{user.anonymousId || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">School</dt>
              <dd className="text-slate-900">{user.school || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Joined</dt>
              <dd className="text-slate-900">{formatDateTime(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last Login</dt>
              <dd className="text-slate-900">{formatDateTime(user.lastLoginAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email Verified</dt>
              <dd className="text-slate-900">{user.emailVerified ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Profile Completed</dt>
              <dd className="text-slate-900">{user.profileCompleted ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900">Seller Status</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Seller</dt>
              <dd className="text-slate-900">{user.isSeller ? 'Verified seller' : 'Not a seller'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Verification</dt>
              <dd>
                <VerificationStatusBadge status={user.verificationStatus} />
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Can Upload Notes</dt>
              <dd className="text-slate-900">{user.isSeller ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Verified Since</dt>
              <dd className="text-slate-900">{formatDateTime(user.verifiedSince)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last Transcript Upload</dt>
              <dd className="text-slate-900">{formatDateTime(user.lastTranscriptUploadAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900">Verification Statistics</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Submitted</dt>
              <dd className="text-2xl font-semibold text-slate-900">{stats.submitted}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Approved</dt>
              <dd className="text-2xl font-semibold text-emerald-700">{stats.approved}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Rejected</dt>
              <dd className="text-2xl font-semibold text-red-700">{stats.rejected}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Pending</dt>
              <dd className="text-2xl font-semibold text-amber-700">{stats.pending}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">Admin review cases: {stats.adminReviews}</p>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Verified Courses</h2>
        {verifiedCourses.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No verified courses yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2">Semester</th>
                  <th className="px-3 py-2">Upload Permission</th>
                </tr>
              </thead>
              <tbody>
                {verifiedCourses.map((course) => (
                  <tr key={course.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-900">{course.courseCode}</p>
                      {course.courseName && <p className="text-xs text-slate-500">{course.courseName}</p>}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{course.grade}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {[course.semester, course.academicYear].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-3 py-3">{course.canUploadNotes ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Verification History</h2>
        {verificationHistory.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No transcript submissions yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Request</th>
                  <th className="px-3 py-2">Submitted</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">AI Confidence</th>
                  <th className="px-3 py-2">Reviewer</th>
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {verificationHistory.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-3">#{item.requestNumber}</td>
                    <td className="px-3 py-3 text-slate-700">{formatDateTime(item.submittedAt)}</td>
                    <td className="px-3 py-3 capitalize text-slate-700">{formatStatusLabel(item.status)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatConfidence(item.aiConfidence)}</td>
                    <td className="px-3 py-3 text-slate-700">{item.reviewerName || '—'}</td>
                    <td className="px-3 py-3 capitalize text-slate-700">
                      {item.adminReviewStatus ? formatStatusLabel(item.adminReviewStatus) : formatStatusLabel(item.status)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {item.adminReviewId ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/grades/${item.adminReviewId}`}>Open review</Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">No admin review</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Audit Timeline</h2>
        {timeline.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No activity recorded yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {timeline.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium capitalize text-slate-900">{formatTimelineLabel(entry.action_type)}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(entry.created_at)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {entry.actor?.full_name || entry.actor?.email || 'System'}
                  {entry.from_status || entry.to_status
                    ? ` · ${entry.from_status || '—'} → ${entry.to_status || '—'}`
                    : ''}
                </p>
                {entry.notes && <p className="mt-1 text-xs text-slate-500">{entry.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminShell>
  );
}
