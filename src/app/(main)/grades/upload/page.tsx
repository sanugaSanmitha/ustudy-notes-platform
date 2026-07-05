'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ParsedCourse = {
  courseCode: string;
  courseName: string;
  grade: string;
};

type UploadResponse = {
  data?: {
    mode: 'parsed' | 'manual_required';
    verificationId: string;
    status: string;
    message: string;
    courses?: ParsedCourse[];
    remainingUploadsToday?: number;
  };
  error?: {
    code?: string;
    message?: string;
    detail?: {
      message?: string | null;
      code?: string | null;
      hint?: string | null;
      details?: string | null;
    } | null;
  };
};

type AdminReviewIssueType =
  | 'incorrect_grades'
  | 'missing_courses'
  | 'wrong_student_info'
  | 'format_not_supported'
  | 'other';

const ADMIN_REVIEW_REASONS: { value: AdminReviewIssueType; label: string }[] = [
  { value: 'incorrect_grades', label: 'AI extracted incorrect grades' },
  { value: 'missing_courses', label: 'Some courses are missing' },
  { value: 'wrong_student_info', label: 'Wrong student information' },
  { value: 'format_not_supported', label: 'My transcript format is different' },
  { value: 'other', label: 'Other' },
];

export default function GradeUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [manualVerificationId, setManualVerificationId] = useState('');
  const [manualCourses, setManualCourses] = useState<ParsedCourse[]>([
    { courseCode: '', courseName: '', grade: '' },
  ]);
  const [manualScreenshotUrl, setManualScreenshotUrl] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [parsedCourses, setParsedCourses] = useState<ParsedCourse[]>([]);
  const [adminReviewModalOpen, setAdminReviewModalOpen] = useState(false);
  const [adminIssueType, setAdminIssueType] = useState<AdminReviewIssueType>('incorrect_grades');
  const [adminMessage, setAdminMessage] = useState('');
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [adminRequestSubmitting, setAdminRequestSubmitting] = useState(false);
  const [cancelReviewSubmitting, setCancelReviewSubmitting] = useState(false);
  const [adminExternalTranscriptUrl, setAdminExternalTranscriptUrl] = useState('');

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError('Please choose a transcript PDF file.');
      return;
    }

    const formData = new FormData();
    formData.append('transcript', file);
    setLoading(true);

    try {
      const response = await fetch('/api/grades/upload', {
        method: 'POST',
        body: formData,
      });

      const rawBody = await response.text();
      let result: UploadResponse = {};
      if (rawBody) {
        try {
          result = JSON.parse(rawBody) as UploadResponse;
        } catch {
          result = {};
        }
      }

      if (!response.ok) {
        const fallbackMessage = result.error?.message || `Upload failed (${response.status}). Please try again.`;
        const detailParts = [
          result.error?.detail?.code,
          result.error?.detail?.message,
          result.error?.detail?.details,
          result.error?.detail?.hint,
        ].filter(Boolean);
        const detailedMessage =
          process.env.NODE_ENV !== 'production' && detailParts.length > 0
            ? `${fallbackMessage} [${detailParts.join(' | ')}]`
            : fallbackMessage;
        setError(detailedMessage);
        return;
      }

      if (!result.data) {
        setError('Upload completed but no response data was returned.');
        return;
      }

      setSuccess(result.data.message);

      if (result.data.mode === 'manual_required') {
        setManualVerificationId(result.data.verificationId);
        return;
      }

      setParsedCourses(result.data.courses || []);
      setTimeout(() => {
        router.push('/grades/status');
      }, 1000);
    } catch (uploadError) {
      console.error('Grade upload request error:', uploadError);
      setError('Unable to upload transcript right now. Please retry in a few seconds.');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (index: number, field: keyof ParsedCourse, value: string) => {
    setManualCourses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addCourseRow = () => {
    setManualCourses((prev) => [...prev, { courseCode: '', courseName: '', grade: '' }]);
  };

  const removeCourseRow = (index: number) => {
    setManualCourses((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const sanitizedCourses = manualCourses
      .map((course) => ({
        courseCode: course.courseCode.trim().toUpperCase(),
        courseName: course.courseName.trim(),
        grade: course.grade.trim().toUpperCase(),
      }))
      .filter((course) => course.courseCode && course.grade);

    if (!manualVerificationId) {
      setError('Manual verification session not found. Please upload your transcript again.');
      return;
    }

    if (sanitizedCourses.length === 0) {
      setError('Please add at least one course and grade.');
      return;
    }

    setManualSubmitting(true);

    try {
      const response = await fetch('/api/grades/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: manualVerificationId,
          courses: sanitizedCourses,
          screenshotUrl: manualScreenshotUrl.trim() || undefined,
          notes: manualNotes.trim() || undefined,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error?.message || 'Failed to submit manual grade details.');
        return;
      }

      setSuccess(result?.data?.message || 'Manual grade details submitted.');
      setTimeout(() => {
        router.push('/grades/status');
      }, 1000);
    } catch (manualError) {
      console.error('Manual grade submit error:', manualError);
      setError('Unable to submit manual grade details right now.');
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleAdminReviewRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!manualVerificationId) {
      setError('Transcript session not found. Please upload your transcript again.');
      return;
    }

    if (!ownershipConfirmed) {
      setError('Please confirm this transcript belongs to you before sending a request.');
      return;
    }

    setAdminRequestSubmitting(true);

    try {
      const response = await fetch('/api/grades/admin-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: manualVerificationId,
          issueType: adminIssueType,
          message: adminMessage.trim() || undefined,
          externalTranscriptUrl: adminExternalTranscriptUrl.trim() || undefined,
          ownershipConfirmed,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error?.message || 'Failed to send admin review request.');
        return;
      }

      setSuccess(result?.data?.message || 'Admin review request sent.');
      setAdminReviewModalOpen(false);
      setOwnershipConfirmed(false);
      setAdminMessage('');
      setAdminExternalTranscriptUrl('');
      setAdminIssueType('incorrect_grades');
    } catch (adminReviewError) {
      console.error('Admin review request error:', adminReviewError);
      setError('Unable to send admin review request right now.');
    } finally {
      setAdminRequestSubmitting(false);
    }
  };

  const handleCancelManualReview = async () => {
    setError('');
    setSuccess('');
    if (!manualVerificationId) {
      setError('Transcript session not found. Please upload your transcript again.');
      return;
    }

    setCancelReviewSubmitting(true);
    try {
      const response = await fetch('/api/grades/admin-review/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId: manualVerificationId }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to cancel manual review.');
        return;
      }
      setSuccess(result?.data?.message || 'Manual review cancelled.');
      setManualVerificationId('');
      setAdminReviewModalOpen(false);
    } catch (cancelError) {
      console.error('Cancel manual review error:', cancelError);
      setError('Unable to cancel manual review right now.');
    } finally {
      setCancelReviewSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Grade Verification</h1>
      <p className="mt-2 text-slate-600">
        Upload your transcript to unlock note uploading. If parsing fails, you can submit grades manually.
      </p>

      <Card className="mt-6 p-6">
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <Label htmlFor="transcript" className="mb-1 block text-sm font-medium text-slate-700">
              Transcript PDF
            </Label>
            <Input
              id="transcript"
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              disabled={loading || manualSubmitting}
            />
            <p className="mt-1 text-xs text-slate-500">Maximum file size: 10MB. Up to 50 submissions per day.</p>
          </div>

          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload Transcript'}
          </Button>
        </form>

        {parsedCourses.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-slate-900">Parsed Courses</h2>
            <ul className="mt-2 space-y-2">
              {parsedCourses.map((course) => (
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
      </Card>

      {manualVerificationId && (
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold text-slate-900">Manual Grade Submission</h2>
          <p className="mt-1 text-sm text-slate-600">
            We could not parse your transcript automatically. Enter your courses and grades below.
          </p>

          <form onSubmit={handleManualSubmit} className="mt-4 space-y-4">
            {manualCourses.map((course, index) => (
              <div key={`manual-course-${index}`} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_1fr_140px_auto]">
                <div>
                  <Label className="mb-1 block text-xs font-medium text-slate-700">Course Code</Label>
                  <Input
                    value={course.courseCode}
                    onChange={(event) => handleCourseChange(index, 'courseCode', event.target.value)}
                    placeholder="COMP1021"
                    disabled={manualSubmitting}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium text-slate-700">Course Name (optional)</Label>
                  <Input
                    value={course.courseName}
                    onChange={(event) => handleCourseChange(index, 'courseName', event.target.value)}
                    placeholder="Introduction to Computer Science"
                    disabled={manualSubmitting}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium text-slate-700">Grade</Label>
                  <Input
                    value={course.grade}
                    onChange={(event) => handleCourseChange(index, 'grade', event.target.value)}
                    placeholder="A-"
                    disabled={manualSubmitting}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeCourseRow(index)}
                    disabled={manualSubmitting || manualCourses.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addCourseRow} disabled={manualSubmitting}>
              Add Course
            </Button>

            <div>
              <Label htmlFor="screenshot-url" className="mb-1 block text-sm font-medium text-slate-700">
                Transcript Screenshot URL (optional)
              </Label>
              <Input
                id="screenshot-url"
                type="url"
                placeholder="https://..."
                value={manualScreenshotUrl}
                onChange={(event) => setManualScreenshotUrl(event.target.value)}
                disabled={manualSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="manual-notes" className="mb-1 block text-sm font-medium text-slate-700">
                Notes for reviewer (optional)
              </Label>
              <Input
                id="manual-notes"
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
                placeholder="Any clarification about your transcript"
                disabled={manualSubmitting}
              />
            </div>

            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={manualSubmitting}>
              {manualSubmitting ? 'Submitting...' : 'Submit Manual Details'}
            </Button>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-800">Still having problems?</p>
              <p className="mt-1 text-sm text-slate-600">
                Request manual transcript review from the admin team.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => setAdminReviewModalOpen(true)}
                disabled={manualSubmitting || adminRequestSubmitting || cancelReviewSubmitting}
              >
                Request Admin Review
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 text-slate-600 hover:text-slate-900"
                onClick={handleCancelManualReview}
                disabled={manualSubmitting || adminRequestSubmitting || cancelReviewSubmitting}
              >
                {cancelReviewSubmitting ? 'Deleting...' : 'Cancel and delete uploaded transcript'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {adminReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Request Manual Transcript Review</h3>
            <p className="mt-1 text-sm text-slate-600">
              Your transcript could not be verified automatically. Tell us what issue you are experiencing and confirm
              consent for storing this transcript for manual review.
            </p>

            <form onSubmit={handleAdminReviewRequest} className="mt-4 space-y-4">
              <fieldset>
                <Label className="mb-2 block text-sm font-medium text-slate-700">
                  Why are you requesting manual review?
                </Label>
                <div className="space-y-2">
                  {ADMIN_REVIEW_REASONS.map((reason) => (
                    <label
                      key={reason.value}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="radio"
                        name="admin-review-reason"
                        className="mt-0.5"
                        value={reason.value}
                        checked={adminIssueType === reason.value}
                        onChange={() => setAdminIssueType(reason.value)}
                        disabled={adminRequestSubmitting}
                      />
                      <span>{reason.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <Label htmlFor="admin-review-message" className="mb-1 block text-sm font-medium text-slate-700">
                  Additional message
                </Label>
                <textarea
                  id="admin-review-message"
                  className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Describe what went wrong (optional)"
                  value={adminMessage}
                  onChange={(event) => setAdminMessage(event.target.value.slice(0, 500))}
                  disabled={adminRequestSubmitting}
                />
                <p className="mt-1 text-xs text-slate-500">Maximum 500 characters</p>
              </div>

              <div>
                <Label htmlFor="admin-review-external-url" className="mb-1 block text-sm font-medium text-slate-700">
                  External transcript link (optional)
                </Label>
                <Input
                  id="admin-review-external-url"
                  type="url"
                  placeholder="https://drive.google.com/... or https://1drv.ms/..."
                  value={adminExternalTranscriptUrl}
                  onChange={(event) => setAdminExternalTranscriptUrl(event.target.value)}
                  disabled={adminRequestSubmitting}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Optional fallback if your cloud file is shared with reviewers.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox
                  checked={ownershipConfirmed}
                  onCheckedChange={(checked) => setOwnershipConfirmed(checked === true)}
                  disabled={adminRequestSubmitting}
                />
                <span>
                  I confirm this transcript belongs to me and I consent to storing it for manual verification.
                </span>
              </label>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdminReviewModalOpen(false)}
                  disabled={adminRequestSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={adminRequestSubmitting || !ownershipConfirmed}
                >
                  {adminRequestSubmitting ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link href="/grades/status" className="text-sm font-medium text-blue-600 hover:underline">
          View verification status
        </Link>
      </div>
    </div>
  );
}
