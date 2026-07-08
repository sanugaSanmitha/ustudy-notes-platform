import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { requireVerificationReviewer } from '@/lib/grades/admin';
import { claimAdminReviewRequest, fetchAdminReviewDetail } from '@/lib/grades/admin-review';
import { listStudentRepliesForReviewRequest } from '@/lib/grades/student-reply';
import { createReviewAction } from '@/lib/grades/review-pipeline';
import { createTranscriptSignedUrl, deleteTranscriptFile } from '@/lib/grades/transcript-storage';
import { computeRejectedRetentionUntil, gradeVerificationConfig } from '@/lib/grades/config';
import { sendGradeVerificationApprovedEmail, sendGradeVerificationRejectedEmail } from '@/lib/email/resend';
import { syncVerifiedCoursesForApproval } from '@/lib/grades/verified-courses';
import { applyRateLimitResponse, requireAdminCsrf } from '@/lib/api/admin-guard';
import { hasHighSeverityRisk, validateCourseRows } from '@/lib/grades/course-validation';
import { assertVerificationOwner, resolveReviewActorRole } from '@/lib/grades/verification-workflow';
import { resolveVerificationReviewRows, type CourseReviewRow } from '@/lib/grades/review-model';

const REJECT_REASONS = [
  'illegible_document',
  'missing_pages',
  'mismatched_student_info',
  'suspected_fraud',
  'incomplete_extraction',
  'other',
] as const;

const updateSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    adminNotes: z.string().trim().max(1000).optional(),
    rejectReason: z.enum(REJECT_REASONS).optional(),
    rejectComment: z.string().trim().max(1000).optional(),
    acknowledgeHighRisk: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'reject') {
      if (!value.rejectReason) {
        ctx.addIssue({ code: 'custom', message: 'Reject reason is required.', path: ['rejectReason'] });
      }
      if (!value.rejectComment || value.rejectComment.length < 10) {
        ctx.addIssue({
          code: 'custom',
          message: 'Reject comment must be at least 10 characters.',
          path: ['rejectComment'],
        });
      }
    }
  });

function buildTranscriptId(verificationId: string, createdAt: string) {
  const year = new Date(createdAt).getUTCFullYear();
  return `TR-${year}-${verificationId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const auth = await requireVerificationReviewer();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const claimResult = await claimAdminReviewRequest(params.requestId, auth.user.id, { isAdmin: auth.isAdmin });
  if (!claimResult.ok) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: claimResult.message } },
      { status: 404 }
    );
  }

  if (claimResult.claimed) {
    try {
      await createReviewAction({
        verificationId: claimResult.request.upload_id,
        reviewRequestId: claimResult.request.id,
        actorUserId: auth.user.id,
        actorRole: resolveReviewActorRole({ isAdmin: auth.isAdmin, isAssistant: auth.isAssistant }),
        actionType: 'review_claimed',
        fromStatus: 'pending',
        toStatus: 'reviewing',
      });
    } catch (reviewActionError) {
      console.error('Admin review claim log error:', reviewActionError);
    }
  }

  const detailResult = await fetchAdminReviewDetail(params.requestId);
  if (!detailResult.ok) {
    if ('notFound' in detailResult && detailResult.notFound) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Admin review request not found.' } },
        { status: 404 }
      );
    }

    console.error('Admin review detail fetch error:', detailResult.error);
    const migrationHint = detailResult.migrationHint;
    const message = migrationHint
      ? `Failed to fetch admin review request. ${migrationHint}`
      : 'Failed to fetch admin review request.';
    return NextResponse.json({ error: { code: 'FETCH_ERROR', message } }, { status: 500 });
  }

  const data = detailResult.request as typeof detailResult.request & {
    status: string;
    review_started_at?: string | null;
  };

  let transcriptUrl: string | null = null;
  let transcriptUrlError: string | null = null;
  const bucket = (data as { grade_verifications?: { transcript_storage_bucket?: string | null } | null }).grade_verifications
    ?.transcript_storage_bucket;
  const path = (data as { grade_verifications?: { transcript_storage_path?: string | null } | null }).grade_verifications
    ?.transcript_storage_path;
  if (bucket && path) {
    try {
      transcriptUrl = await createTranscriptSignedUrl(bucket, path, gradeVerificationConfig.signedUrlExpiresSeconds);
    } catch (signedError) {
      console.error('Admin review signed URL error:', signedError);
      transcriptUrlError = signedError instanceof Error ? signedError.message : 'Failed to generate transcript access URL.';
    }
  } else {
    transcriptUrlError = 'Transcript file is not stored for this review request.';
  }

  const readOnly =
    claimResult.readOnly || data.status === 'approved' || data.status === 'rejected';

  const studentReplies = await listStudentRepliesForReviewRequest(params.requestId).catch(() => []);

  return NextResponse.json(
    {
      data: {
        request: data,
        studentReplies,
        transcriptUrl,
        transcriptUrlError,
        readOnly,
        lockedBy: 'reviewerName' in claimResult ? claimResult.reviewerName : null,
        reviewStartedAt: data.review_started_at || null,
      },
    },
    { status: 200 }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const csrfError = requireAdminCsrf(request);
  if (csrfError) return csrfError;

  const auth = await requireVerificationReviewer();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const rateError = applyRateLimitResponse(auth.user.id);
  if (rateError) return rateError;

  const parsedBody = updateSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsedBody.error.issues[0]?.message || 'Invalid input' } },
      { status: 400 }
    );
  }

  const { action, adminNotes, rejectReason, rejectComment, acknowledgeHighRisk } = parsedBody.data;

  const { data: reviewRequest, error: requestError } = await adminClient
    .from('admin_review_requests')
    .select(
      'id, upload_id, status, user_id, reviewed_by, assigned_to, updated_at, grade_verifications(id, review_rows, manual_courses, parsed_courses, risk_level, risk_score, created_at, transcript_storage_bucket, transcript_storage_path)'
    )
    .eq('id', params.requestId)
    .maybeSingle();

  if (requestError) {
    console.error('Admin review action fetch error:', requestError);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to load review request.' } },
      { status: 500 }
    );
  }

  if (!reviewRequest) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Review request not found.' } },
      { status: 404 }
    );
  }

  if (reviewRequest.status === 'approved' || reviewRequest.status === 'rejected') {
    return NextResponse.json(
      {
        error: {
          code: 'ALREADY_PROCESSED',
          message: 'This request has already been processed.',
        },
      },
      { status: 409 }
    );
  }

  if (
    reviewRequest.status === 'reviewing' &&
    reviewRequest.reviewed_by &&
    reviewRequest.reviewed_by !== auth.user.id
  ) {
    return NextResponse.json(
      {
        error: {
          code: 'LOCKED',
          message: 'This request is being reviewed by another admin.',
        },
      },
      { status: 409 }
    );
  }

  const ownerCheck = assertVerificationOwner(reviewRequest, auth.user.id, { isAdmin: auth.isAdmin });
  if (!ownerCheck.ok && reviewRequest.status !== 'pending') {
    return NextResponse.json({ error: { code: ownerCheck.code, message: ownerCheck.message } }, { status: 409 });
  }

  if (reviewRequest.status === 'pending' && !auth.isAdmin) {
    return NextResponse.json(
      { error: { code: 'NOT_CLAIMED', message: 'Claim this verification before approving or rejecting.' } },
      { status: 409 }
    );
  }

  const verification = (reviewRequest as {
    grade_verifications?: {
      id?: string;
      review_rows?: CourseReviewRow[];
      risk_level?: string | null;
      created_at?: string;
      transcript_storage_bucket?: string | null;
      transcript_storage_path?: string | null;
    } | null;
  }).grade_verifications;

  if (action === 'approve') {
    const rows = resolveVerificationReviewRows(
      (verification || {}) as {
        review_rows?: CourseReviewRow[] | null;
        manual_courses?: CourseReviewRow[] | null;
        parsed_courses?: CourseReviewRow[] | null;
      }
    );
    const issues = validateCourseRows(rows);
    if (issues.length > 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: issues[0]?.message || 'Course validation failed.', details: issues } },
        { status: 400 }
      );
    }

    if (hasHighSeverityRisk(verification?.risk_level) && !acknowledgeHighRisk) {
      return NextResponse.json(
        { error: { code: 'UNRESOLVED_RISK_FLAGS', message: 'High-severity risk requires explicit acknowledgment.' } },
        { status: 422 }
      );
    }
  }

  const now = new Date().toISOString();
  const newReviewStatus = action === 'approve' ? 'approved' : 'rejected';
  const newVerificationStatus = action === 'approve' ? 'approved' : 'rejected';
  const rejectedRetentionUntil = action === 'reject' ? computeRejectedRetentionUntil(now) : null;
  const previousStatus = reviewRequest.status;

  const studentFacingNotes =
    action === 'reject'
      ? [rejectComment, adminNotes].filter(Boolean).join('\n\n') || null
      : adminNotes || null;

  const { data: updatedReview, error: reviewUpdateError } = await adminClient
    .from('admin_review_requests')
    .update({
      status: newReviewStatus,
      admin_notes: studentFacingNotes,
      reject_reason: action === 'reject' ? rejectReason : null,
      reject_comment: action === 'reject' ? rejectComment : null,
      reviewed_by: reviewRequest.reviewed_by || auth.user.id,
      resolved_at: now,
      updated_at: now,
    })
    .eq('id', params.requestId)
    .in('status', ['pending', 'reviewing', 'waiting_student', 'escalated', 'pending_reassignment'])
    .select('id, upload_id, status, user_id')
    .maybeSingle();

  if (reviewUpdateError) {
    console.error('Admin review update error:', reviewUpdateError);
    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message: 'Failed to update review request.' } },
      { status: 500 }
    );
  }

  if (!updatedReview) {
    return NextResponse.json(
      {
        error: {
          code: 'ALREADY_PROCESSED',
          message: 'This request has already been processed.',
        },
      },
      { status: 409 }
    );
  }

  const { error: verificationUpdateError } = await adminClient
    .from('grade_verifications')
    .update({
      status: newVerificationStatus,
      reviewer_note: studentFacingNotes,
      reviewed_at: now,
      approved_at: action === 'approve' ? now : null,
      confirmation_required: false,
      rejected_retention_until: rejectedRetentionUntil,
      ...(action === 'approve'
        ? {
            transcript_storage_bucket: null,
            transcript_storage_path: null,
            transcript_storage_uploaded_at: null,
          }
        : {}),
      updated_at: now,
    })
    .eq('id', updatedReview.upload_id);

  if (verificationUpdateError) {
    console.error('Admin verification update error:', verificationUpdateError);
    await adminClient
      .from('admin_review_requests')
      .update({
        status: previousStatus,
        admin_notes: null,
        resolved_at: null,
        updated_at: now,
      })
      .eq('id', params.requestId)
      .eq('status', newReviewStatus);

    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message: 'Failed to update transcript verification status.' } },
      { status: 500 }
    );
  }

  const { data: queueRecord, error: queueFetchError } = await adminClient
    .from('grade_parse_queue')
    .select('id, status')
    .eq('verification_id', updatedReview.upload_id)
    .maybeSingle();

  if (queueFetchError) {
    console.error('Admin queue fetch error:', queueFetchError);
  }

  if (queueRecord) {
    const { error: queueUpdateError } = await adminClient
      .from('grade_parse_queue')
      .update({
        status: newVerificationStatus,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', queueRecord.id);

    if (queueUpdateError) {
      console.error('Admin queue update error:', queueUpdateError);
    }

    try {
      await createReviewAction({
        verificationId: updatedReview.upload_id,
        queueId: queueRecord.id,
        reviewRequestId: updatedReview.id,
        actorUserId: auth.user.id,
        actorRole: resolveReviewActorRole({ isAdmin: auth.isAdmin, isAssistant: auth.isAssistant }),
        actionType: action === 'approve' ? 'admin_approved' : 'admin_rejected',
        fromStatus: queueRecord.status,
        toStatus: newVerificationStatus,
        notes: studentFacingNotes,
        afterPayload: action === 'approve' ? { reviewRows: verification?.review_rows || [] } : { rejectReason, rejectComment },
      });
    } catch (reviewActionError) {
      console.error('Admin review action log error:', reviewActionError);
    }
  }

  if (action === 'approve') {
    const { error: sellerUpdateError } = await adminClient
      .from('users')
      .update({
        is_seller: true,
        updated_at: now,
      })
      .eq('id', updatedReview.user_id);
    if (sellerUpdateError) {
      console.error('Admin seller update error:', sellerUpdateError);
    }

    try {
      await syncVerifiedCoursesForApproval(updatedReview.upload_id, updatedReview.user_id);
    } catch (syncError) {
      console.error('Admin verified courses sync error:', syncError);
    }
  }

  const transcriptBucket = (reviewRequest as { grade_verifications?: { transcript_storage_bucket?: string | null } | null })
    .grade_verifications?.transcript_storage_bucket;
  const transcriptPath = (reviewRequest as { grade_verifications?: { transcript_storage_path?: string | null } | null })
    .grade_verifications?.transcript_storage_path;
  if (action === 'approve' && transcriptBucket && transcriptPath) {
    try {
      await deleteTranscriptFile(transcriptBucket, transcriptPath);
    } catch (storageDeleteError) {
      console.error('Admin review resolve storage delete error:', storageDeleteError);
    }
  }

  const { data: studentProfile, error: studentProfileError } = await adminClient
    .from('users')
    .select('email, full_name')
    .eq('id', updatedReview.user_id)
    .maybeSingle();
  if (studentProfileError) {
    console.error('Admin review student profile fetch error:', studentProfileError);
  }
  if (studentProfile?.email) {
    const payload = {
      studentEmail: studentProfile.email,
      studentName: studentProfile.full_name || studentProfile.email,
      transcriptId: buildTranscriptId(
        (reviewRequest as { grade_verifications?: { id?: string | null } | null }).grade_verifications?.id ||
          updatedReview.upload_id,
        (reviewRequest as { grade_verifications?: { created_at?: string | null } | null }).grade_verifications
          ?.created_at || now
      ),
      adminNotes: studentFacingNotes,
    };
    if (action === 'approve') {
      void sendGradeVerificationApprovedEmail(payload);
    } else {
      void sendGradeVerificationRejectedEmail(payload);
    }
  }

  return NextResponse.json(
    {
      data: {
        requestId: updatedReview.id,
        status: newReviewStatus,
        verificationStatus: newVerificationStatus,
        nextPendingId: action === 'approve' || action === 'reject' ? await findNextPendingReviewId() : null,
      },
    },
    { status: 200 }
  );
}

async function findNextPendingReviewId() {
  const { data } = await adminClient
    .from('admin_review_requests')
    .select('id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}
