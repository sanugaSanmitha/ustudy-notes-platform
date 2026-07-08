'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CourseCodeInput } from '@/components/courses/course-code-input';
import { MANUAL_SUBMISSION_GRADES, isValidManualSubmissionGrade } from '@/lib/grades/course-validation';
import { createClient } from '@/lib/supabase/client';

type ParsedCourse = {
  courseCode: string;
  courseName: string;
  grade: string;
};

type CourseReviewRow = {
  id: string;
  source: 'ai' | 'user_added';
  rowState: 'green' | 'purple' | 'orange';
  edited: boolean;
  confidence: number | null;
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
    reviewRows?: CourseReviewRow[];
    autoApprovalEligible?: boolean;
    confirmationRequired?: boolean;
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
  const [sellerRequiredNotice, setSellerRequiredNotice] = useState(false);
  const [maxUploadsPerDay, setMaxUploadsPerDay] = useState(50);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(10);
  const [manualVerificationId, setManualVerificationId] = useState('');
  const [manualCourses, setManualCourses] = useState<ParsedCourse[]>([
    { courseCode: '', courseName: '', grade: '' },
  ]);
  const [manualScreenshotUrl, setManualScreenshotUrl] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [reviewVerificationId, setReviewVerificationId] = useState('');
  const [reviewRows, setReviewRows] = useState<CourseReviewRow[]>([]);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [autoApprovalEligible, setAutoApprovalEligible] = useState(false);
  const [adminReviewModalOpen, setAdminReviewModalOpen] = useState(false);
  const [adminIssueType, setAdminIssueType] = useState<AdminReviewIssueType>('incorrect_grades');
  const [adminMessage, setAdminMessage] = useState('');
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [adminRequestSubmitting, setAdminRequestSubmitting] = useState(false);
  const [adminReviewModalError, setAdminReviewModalError] = useState('');
  const [cancelReviewSubmitting, setCancelReviewSubmitting] = useState(false);
  const [adminExternalTranscriptUrl, setAdminExternalTranscriptUrl] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSellerRequiredNotice(params.get('reason') === 'seller_required');

    const checkSellerRedirect = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('users').select('is_seller').eq('id', user.id).maybeSingle();
      if (profile?.is_seller) {
        router.replace('/notes/upload');
      }
    };

    const bootstrap = async () => {
      try {
        const [configResponse, statusResponse] = await Promise.all([
          fetch('/api/grades/config', { cache: 'no-store' }),
          fetch('/api/grades/status', { cache: 'no-store', credentials: 'same-origin' }),
        ]);
        const configResult = await configResponse.json().catch(() => null);
        if (configResponse.ok && configResult?.data) {
          setMaxUploadsPerDay(configResult.data.maxUploadsPerDay || 50);
          setMaxFileSizeMb(configResult.data.maxFileSizeMb || 10);
        }

        const statusResult = await statusResponse.json().catch(() => null);
        const latest = statusResult?.data?.latestVerification;
        if (
          statusResponse.ok &&
          latest?.status === 'pending_review' &&
          latest.confirmation_required &&
          Array.isArray(latest.review_rows) &&
          latest.review_rows.length > 0
        ) {
          setReviewVerificationId(latest.id);
          setReviewRows(latest.review_rows);
          setAutoApprovalEligible(Boolean(latest.auto_approval_eligible));
          setSuccess('Resume your pending course review below.');
        }
      } catch (bootstrapError) {
        console.error('Grade upload bootstrap error:', bootstrapError);
      }
    };

    void checkSellerRedirect();
    void bootstrap();
  }, [router]);

  const rowSummary = useMemo(() => {
    let green = 0;
    let purple = 0;
    let orange = 0;
    for (const row of reviewRows) {
      if (row.rowState === 'purple') purple += 1;
      else if (row.rowState === 'orange') orange += 1;
      else green += 1;
    }
    return {
      green,
      purple,
      orange,
      hasOnlyGreen: purple === 0 && orange === 0 && reviewRows.length > 0,
      hasNeedsReview: purple > 0 || orange > 0,
    };
  }, [reviewRows]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setReviewVerificationId('');
    setReviewRows([]);
    setAutoApprovalEligible(false);

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
        const responseText = rawBody.trim();
        const nonHtmlResponseSnippet =
          responseText && !responseText.startsWith('<') ? responseText.slice(0, 220) : '';
        const fallbackMessage =
          result.error?.message ||
          nonHtmlResponseSnippet ||
          (response.status === 500
            ? 'Upload failed (500). Check Vercel env vars and Supabase migrations, then redeploy.'
            : `Upload failed (${response.status}). Please try again.`);
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

      setManualVerificationId('');
      setReviewVerificationId(result.data.verificationId);
      setReviewRows(result.data.reviewRows || []);
      setAutoApprovalEligible(Boolean(result.data.autoApprovalEligible));
    } catch (uploadError) {
      console.error('Grade upload request error:', uploadError);
      setError('Unable to upload transcript right now. Please retry in a few seconds.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewRowChange = (rowId: string, field: 'courseCode' | 'courseName' | 'grade', value: string) => {
    setReviewRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) {
          return row;
        }
        if (row.source === 'user_added') {
          return {
            ...row,
            [field]: value,
            rowState: 'orange',
            edited: false,
          };
        }
        return {
          ...row,
          [field]: value,
          rowState: 'purple',
          edited: true,
        };
      })
    );
  };

  const addUserReviewRow = () => {
    const id = crypto.randomUUID();
    setReviewRows((prev) => [
      ...prev,
      {
        id,
        source: 'user_added',
        rowState: 'orange',
        edited: false,
        confidence: null,
        courseCode: '',
        courseName: '',
        grade: '',
      },
    ]);
  };

  const removeReviewRow = (rowId: string) => {
    setReviewRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleConfirmAiResults = async () => {
    setError('');
    setSuccess('');
    if (!reviewVerificationId) {
      setError('No verification session found. Please upload again.');
      return;
    }
    if (!rowSummary.hasOnlyGreen) {
      setError('Automatic confirmation requires all rows to remain green (no edits or added courses).');
      return;
    }
    setReviewSaving(true);
    try {
      const response = await fetch('/api/grades/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: reviewVerificationId,
          reviewRows,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to confirm AI results.');
        return;
      }
      setSuccess(result?.data?.message || 'Transcript verified.');
      setTimeout(() => {
        router.push('/grades/status');
      }, 900);
    } catch (confirmError) {
      console.error('Confirm AI results error:', confirmError);
      setError('Unable to confirm AI results right now.');
    } finally {
      setReviewSaving(false);
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

    if (sanitizedCourses.some((course) => !isValidManualSubmissionGrade(course.grade))) {
      setError('Each grade must be A+, A, A-, B+, B, or B-.');
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
    setAdminReviewModalError('');
    const activeVerificationId = reviewVerificationId || manualVerificationId;

    if (!activeVerificationId) {
      setAdminReviewModalError('Transcript session not found. Please upload your transcript again.');
      return;
    }

    if (!ownershipConfirmed) {
      setAdminReviewModalError('Please confirm this transcript belongs to you before sending a request.');
      return;
    }

    setAdminRequestSubmitting(true);

    try {
      const response = await fetch('/api/grades/admin-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: activeVerificationId,
          issueType: adminIssueType,
          message: adminMessage.trim() || undefined,
          externalTranscriptUrl: adminExternalTranscriptUrl.trim() || undefined,
          ownershipConfirmed,
          courseRows: reviewVerificationId
            ? reviewRows
            : manualCourses
                .filter((course) => course.courseCode.trim() && course.grade.trim())
                .map((course) => ({
                  source: 'user_added' as const,
                  edited: true,
                  courseCode: course.courseCode.trim(),
                  courseName: course.courseName.trim(),
                  grade: course.grade.trim(),
                })),
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setAdminReviewModalError(result?.error?.message || 'Failed to send admin review request.');
        return;
      }

      setAdminReviewModalOpen(false);
      setOwnershipConfirmed(false);
      setAdminMessage('');
      setAdminExternalTranscriptUrl('');
      setAdminIssueType('incorrect_grades');
      setAdminReviewModalError('');
      setManualVerificationId('');
      setReviewVerificationId('');
      setReviewRows([]);
      setAutoApprovalEligible(false);
      setSuccess(result?.data?.message || 'Admin review request sent.');
      setTimeout(() => {
        router.push('/grades/status');
      }, 600);
    } catch (adminReviewError) {
      console.error('Admin review request error:', adminReviewError);
      setAdminReviewModalError('Unable to send admin review request right now.');
    } finally {
      setAdminRequestSubmitting(false);
    }
  };

  const handleCancelManualReview = async () => {
    setError('');
    setSuccess('');
    const activeVerificationId = reviewVerificationId || manualVerificationId;
    if (!activeVerificationId) {
      setError('Transcript session not found. Please upload your transcript again.');
      return;
    }

    setCancelReviewSubmitting(true);
    try {
      const response = await fetch('/api/grades/admin-review/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId: activeVerificationId }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to cancel manual review.');
        return;
      }
      setSuccess(result?.data?.message || 'Manual review cancelled.');
      setManualVerificationId('');
      setReviewVerificationId('');
      setReviewRows([]);
      setAutoApprovalEligible(false);
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

      {sellerRequiredNotice && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Complete grade verification before uploading notes.
        </div>
      )}

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
            <p className="mt-1 text-xs text-slate-500">
              Maximum file size: {maxFileSizeMb}MB. Up to {maxUploadsPerDay} submissions per day.
            </p>
          </div>

          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload Transcript'}
          </Button>
        </form>

        {reviewVerificationId && reviewRows.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-slate-900">Review Extracted Courses</h2>
            <p className="mt-1 text-sm text-slate-600">
              Keep all rows Green to auto-approve. Edited AI rows become Purple, and user-added rows are Orange.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Green: {rowSummary.green} | Purple: {rowSummary.purple} | Orange: {rowSummary.orange}
            </p>
            <ul className="mt-3 space-y-3">
              {reviewRows.map((row) => {
                const rowStyle =
                  row.rowState === 'green'
                    ? 'border-emerald-300 bg-emerald-50'
                    : row.rowState === 'purple'
                      ? 'border-violet-300 bg-violet-50'
                      : 'border-orange-300 bg-orange-50';
                return (
                  <li key={row.id} className={`rounded-md border p-3 text-sm ${rowStyle}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {row.rowState === 'green'
                          ? 'Green'
                          : row.rowState === 'purple'
                            ? 'Purple (Edited)'
                            : 'Orange (User Added)'}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => removeReviewRow(row.id)}
                        disabled={reviewSaving || adminRequestSubmitting}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <CourseCodeInput
                        value={row.courseCode}
                        onChange={(value) => handleReviewRowChange(row.id, 'courseCode', value)}
                        onCourseSelect={(course) => {
                          setReviewRows((prev) =>
                            prev.map((item) => {
                              if (item.id !== row.id) return item;
                              const updated = {
                                ...item,
                                courseCode: course.courseCode,
                                courseName: item.courseName.trim() ? item.courseName : course.courseTitle,
                              };
                              if (item.source === 'user_added') {
                                return { ...updated, rowState: 'orange' as const, edited: false };
                              }
                              return { ...updated, rowState: 'purple' as const, edited: true };
                            })
                          );
                        }}
                        placeholder="COMP1021"
                        disabled={reviewSaving || adminRequestSubmitting}
                      />
                      <Input
                        value={row.courseName}
                        onChange={(event) => handleReviewRowChange(row.id, 'courseName', event.target.value)}
                        placeholder="Course Name"
                        disabled={reviewSaving || adminRequestSubmitting}
                      />
                      <Input
                        value={row.grade}
                        onChange={(event) => handleReviewRowChange(row.id, 'grade', event.target.value)}
                        placeholder="A-"
                        disabled={reviewSaving || adminRequestSubmitting}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={addUserReviewRow}
                disabled={reviewSaving || adminRequestSubmitting}
              >
                Add Missing Course
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirmAiResults}
                disabled={reviewSaving || adminRequestSubmitting || !autoApprovalEligible || !rowSummary.hasOnlyGreen}
              >
                {reviewSaving ? 'Confirming...' : 'Confirm AI Results'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAdminReviewModalError('');
                  setAdminReviewModalOpen(true);
                }}
                disabled={
                  reviewSaving ||
                  adminRequestSubmitting ||
                  !(rowSummary.hasNeedsReview || !autoApprovalEligible)
                }
              >
                Request Admin Review
              </Button>
            </div>
            {!autoApprovalEligible && (
              <p className="mt-2 text-xs text-amber-700">
                This submission is not auto-approval eligible due to risk checks. Please request admin review.
              </p>
            )}
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
                  <CourseCodeInput
                    value={course.courseCode}
                    onChange={(value) => handleCourseChange(index, 'courseCode', value)}
                    onCourseSelect={(selected) => {
                      setManualCourses((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                courseCode: selected.courseCode,
                                courseName: item.courseName.trim() ? item.courseName : selected.courseTitle,
                              }
                            : item
                        )
                      );
                    }}
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
                  <select
                    value={course.grade}
                    onChange={(event) => handleCourseChange(index, 'grade', event.target.value)}
                    disabled={manualSubmitting}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select grade</option>
                    {MANUAL_SUBMISSION_GRADES.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
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
                onClick={() => {
                  setAdminReviewModalError('');
                  setAdminReviewModalOpen(true);
                }}
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
              {adminReviewModalError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {adminReviewModalError}
                </div>
              )}
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
                  onClick={() => {
                    setAdminReviewModalError('');
                    setAdminReviewModalOpen(false);
                  }}
                  disabled={adminRequestSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={
                    adminRequestSubmitting ||
                    !ownershipConfirmed ||
                    (reviewVerificationId ? !(rowSummary.hasNeedsReview || !autoApprovalEligible) : false)
                  }
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
