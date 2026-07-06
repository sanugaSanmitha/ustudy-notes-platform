'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type GradeCourse = {
  courseCode: string;
  courseName?: string;
  grade: string;
};

type GradeVerification = {
  id: string;
  status: 'manual_required' | 'pending_review' | 'approved' | 'rejected';
  submission_type: 'pdf_auto' | 'pdf_manual' | 'manual';
  parsed_courses: GradeCourse[] | null;
  manual_courses: GradeCourse[] | null;
  review_rows:
    | Array<{
        source: 'ai' | 'user_added';
        rowState: 'green' | 'purple' | 'orange';
        courseCode: string;
        courseName?: string;
        grade: string;
      }>
    | null;
  confirmation_required: boolean;
  auto_approval_eligible: boolean;
  reviewer_note: string | null;
  notes: string | null;
  screenshot_url: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type StatusResponse = {
  data?: {
    latestVerification: GradeVerification | null;
    uploadsToday: number;
    remainingUploadsToday: number;
    maxUploadsPerDay?: number;
  };
  error?: { code?: string; message?: string };
};

const STATUS_COPY: Record<GradeVerification['status'], { label: string; className: string }> = {
  manual_required: {
    label: 'Manual details required',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  pending_review: {
    label: 'Pending review',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

export default function GradeStatusPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusData, setStatusData] = useState<StatusResponse['data']>(undefined);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/grades/status', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const result: StatusResponse = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(result.error?.message || 'Failed to load grade verification status.');
          return;
        }

        setStatusData(result.data);
      } catch (statusError) {
        console.error('Grade status fetch error:', statusError);
        setError('Unable to load grade verification status right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        <div className="mt-4">
          <Link href="/grades/upload" className="text-sm font-medium text-blue-600 hover:underline">
            Back to upload
          </Link>
        </div>
      </div>
    );
  }

  const latest = statusData?.latestVerification;
  const quotaTotal =
    statusData?.maxUploadsPerDay ??
    (statusData?.uploadsToday || 0) + (statusData?.remainingUploadsToday || 0);
  const courses =
    latest?.manual_courses ||
    latest?.review_rows?.map((row) => ({
      courseCode: row.courseCode,
      courseName: row.courseName || '',
      grade: row.grade,
    })) ||
    latest?.parsed_courses ||
    [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Grade Verification Status</h1>
      <p className="mt-2 text-slate-600">Track your latest submission and review progress.</p>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Daily quota</h2>
        <p className="mt-1 text-sm text-slate-600">
          Uploaded today: {statusData?.uploadsToday || 0} / {quotaTotal}
        </p>
        <p className="text-sm text-slate-600">Remaining today: {statusData?.remainingUploadsToday || 0}</p>
      </Card>

      {!latest ? (
        <Card className="mt-6 p-6">
          <p className="text-sm text-slate-700">No grade verification submitted yet.</p>
          <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
            <Link href="/grades/upload">Upload Transcript</Link>
          </Button>
        </Card>
      ) : (
        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Latest submission</h2>
            <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${STATUS_COPY[latest.status].className}`}>
              {STATUS_COPY[latest.status].label}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Submitted at {new Date(latest.created_at).toLocaleString()}
          </p>
          {latest.status === 'pending_review' && latest.confirmation_required && (
            <p className="text-sm text-amber-700">
              Review is waiting for your confirmation. Return to upload page to confirm AI rows or request admin review.
            </p>
          )}
          {latest.reviewed_at && (
            <p className="text-sm text-slate-600">
              Reviewed at {new Date(latest.reviewed_at).toLocaleString()}
            </p>
          )}

          {courses.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-800">Submitted courses</h3>
              <ul className="mt-2 space-y-2">
                {courses.map((course) => (
                  <li key={`${course.courseCode}-${course.grade}`} className="rounded-md border border-slate-200 p-3 text-sm">
                    <p className="font-medium">{course.courseCode}</p>
                    {course.courseName ? (
                      <p className="text-slate-700">{course.courseName}</p>
                    ) : (
                      <p className="text-slate-500">Course title unavailable</p>
                    )}
                    <p className="text-slate-700">Grade: {course.grade}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {latest.reviewer_note && (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700">Reviewer note</p>
              <p className="mt-1 text-sm text-slate-700">{latest.reviewer_note}</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/grades/upload">Submit another transcript</Link>
            </Button>
            {latest.status === 'manual_required' && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/grades/upload">Complete manual submission</Link>
              </Button>
            )}
            {latest.status === 'pending_review' && latest.confirmation_required && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/grades/upload">Review AI extracted courses</Link>
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
