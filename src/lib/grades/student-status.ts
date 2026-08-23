import { adminClient } from '@/lib/supabase/admin';
import { gradeVerificationConfig, formatReuploadCooldownRemaining, isStudentCancelledVerification } from '@/lib/grades/config';
import { fetchOpenAdminReviewForStudent } from '@/lib/grades/student-reply';
import { STATUS_LABELS, type VerificationStatus } from '@/lib/grades/verification-workflow';

export type StudentGradeCourseRow = {
  courseCode: string;
  courseName: string;
  grade: string;
  sourceLabel: string;
  rowState?: 'green' | 'purple' | 'orange';
};

export type StudentGradeVerificationSnapshot = {
  isVerifiedSeller: boolean;
  canReuploadTranscript: boolean;
  reuploadCooldownLabel: string | null;
  reuploadAvailableAt: string | null;
  uploadsToday: number;
  remainingUploadsToday: number;
  maxUploadsPerDay: number;
  verifiedCourseCount: number;
  latestVerification: {
    id: string;
    status: 'manual_required' | 'pending_review' | 'approved' | 'rejected';
    submission_type: 'pdf_auto' | 'pdf_manual' | 'manual' | string;
    transcript_filename: string | null;
    parsed_courses: Array<{ courseCode: string; courseName?: string; grade: string }> | null;
    manual_courses: Array<{ courseCode: string; courseName?: string; grade: string }> | null;
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
    verification_decision: string | null;
    risk_level: string | null;
    created_at: string;
    reviewed_at: string | null;
  } | null;
  latestQueue: {
    id: string;
    status: string;
    queue_tier: string;
    confidence_score: number | null;
    assigned_to: string | null;
    reviewed_at: string | null;
    updated_at: string;
  } | null;
  openAdminReview: {
    id: string;
    status: string;
    statusLabel: string;
    studentInfoRequest: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  recentSubmissions: Array<{
    id: string;
    status: string;
    submission_type: string;
    reviewer_note: string | null;
    created_at: string;
    reviewed_at: string | null;
  }>;
};

const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  pdf_auto: 'PDF transcript (auto-parsed)',
  pdf_manual: 'PDF transcript (manual review)',
  manual: 'Manual course entry',
};

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  manual_required: 'Manual details required',
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function getSubmissionTypeLabel(submissionType: string | null | undefined) {
  if (!submissionType) return 'Unknown submission type';
  return SUBMISSION_TYPE_LABELS[submissionType] || submissionType.replace(/_/g, ' ');
}

export function getVerificationStatusLabel(
  status: string | null | undefined,
  reviewerNote?: string | null
) {
  if (!status) return 'Unknown';
  if (isStudentCancelledVerification({ status, reviewer_note: reviewerNote })) {
    return 'Cancelled';
  }
  return VERIFICATION_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

export function resolveStudentCourseRows(
  verification: StudentGradeVerificationSnapshot['latestVerification']
): StudentGradeCourseRow[] {
  if (!verification) return [];

  if (verification.review_rows?.length) {
    return verification.review_rows.map((row) => ({
      courseCode: row.courseCode,
      courseName: row.courseName || '',
      grade: row.grade,
      rowState: row.rowState,
      sourceLabel:
        row.source === 'user_added'
          ? 'Added by you'
          : row.rowState === 'purple'
            ? 'AI extracted (edited)'
            : 'AI extracted',
    }));
  }

  const manual = verification.manual_courses || [];
  const parsed = verification.parsed_courses || [];
  const source = manual.length > 0 ? manual : parsed;

  return source.map((course) => ({
    courseCode: course.courseCode,
    courseName: course.courseName || '',
    grade: course.grade,
    sourceLabel: manual.length > 0 ? 'Manual entry' : 'AI extracted',
  }));
}

export async function fetchStudentGradeVerificationSnapshot(
  userId: string
): Promise<StudentGradeVerificationSnapshot> {
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  const [{ count: uploadsTodayCount }, { data: latest }, { data: userProfile }, { count: verifiedCourseCount }] =
    await Promise.all([
      adminClient
        .from('grade_verifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', dayStart),
      adminClient
        .from('grade_verifications')
        .select(
          'id, status, submission_type, transcript_filename, parsed_courses, manual_courses, review_rows, confirmation_required, auto_approval_eligible, reviewer_note, notes, verification_decision, risk_level, created_at, reviewed_at'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminClient.from('users').select('is_seller').eq('id', userId).maybeSingle(),
      adminClient
        .from('verified_courses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);

  let latestQueue: StudentGradeVerificationSnapshot['latestQueue'] = null;
  if (latest?.id) {
    const { data: queueData } = await adminClient
      .from('grade_parse_queue')
      .select('id, status, queue_tier, confidence_score, assigned_to, reviewed_at, updated_at')
      .eq('verification_id', latest.id)
      .maybeSingle();
    latestQueue = queueData;
  }

  const { data: recentSubmissions } = await adminClient
    .from('grade_verifications')
    .select('id, status, submission_type, reviewer_note, created_at, reviewed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  const isVerifiedSeller = Boolean(userProfile?.is_seller);
  const hasActiveVerification =
    (latest?.status === 'pending_review' || latest?.status === 'manual_required') &&
    !isStudentCancelledVerification(latest);
  let reuploadCooldownRemainingMs = 0;
  let reuploadAvailableAt: string | null = null;
  let canReuploadTranscript = !isVerifiedSeller;

  if (isVerifiedSeller) {
    canReuploadTranscript = !hasActiveVerification;
    if (!hasActiveVerification && latest?.created_at) {
      const elapsedMs = now.getTime() - new Date(latest.created_at).getTime();
      reuploadCooldownRemainingMs = Math.max(0, gradeVerificationConfig.reuploadCooldownMs - elapsedMs);
      canReuploadTranscript = reuploadCooldownRemainingMs === 0;
      reuploadAvailableAt =
        reuploadCooldownRemainingMs > 0 ? new Date(now.getTime() + reuploadCooldownRemainingMs).toISOString() : null;
    }
  }

  let openAdminReview: StudentGradeVerificationSnapshot['openAdminReview'] = null;
  try {
    const review = await fetchOpenAdminReviewForStudent(userId, latest?.id);
    if (review) {
      openAdminReview = {
        id: review.id,
        status: review.status,
        statusLabel: STATUS_LABELS[review.status as VerificationStatus] || review.status.replace(/_/g, ' '),
        studentInfoRequest: review.student_info_request,
        createdAt: review.created_at,
        updatedAt: review.updated_at,
      };
    }
  } catch {
    openAdminReview = null;
  }

  return {
    isVerifiedSeller,
    canReuploadTranscript,
    reuploadCooldownLabel:
      reuploadCooldownRemainingMs > 0 ? formatReuploadCooldownRemaining(reuploadCooldownRemainingMs) : null,
    reuploadAvailableAt,
    uploadsToday: uploadsTodayCount || 0,
    remainingUploadsToday: Math.max(0, gradeVerificationConfig.maxUploadsPerDay - (uploadsTodayCount || 0)),
    maxUploadsPerDay: gradeVerificationConfig.maxUploadsPerDay,
    verifiedCourseCount: verifiedCourseCount || 0,
    latestVerification: latest || null,
    latestQueue,
    openAdminReview,
    recentSubmissions: recentSubmissions || [],
  };
}
