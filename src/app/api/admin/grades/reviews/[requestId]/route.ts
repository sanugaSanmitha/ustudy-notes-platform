import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/grades/admin';
import { claimAdminReviewRequest, fetchAdminReviewDetail } from '@/lib/grades/admin-review';
import { createReviewAction } from '@/lib/grades/review-pipeline';
import { createTranscriptSignedUrl, deleteTranscriptFile } from '@/lib/grades/transcript-storage';
import { computeRejectedRetentionUntil, gradeVerificationConfig } from '@/lib/grades/config';
import { sendGradeVerificationApprovedEmail, sendGradeVerificationRejectedEmail } from '@/lib/email/resend';

const updateSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNotes: z.string().trim().max(1000).optional(),
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
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const claimResult = await claimAdminReviewRequest(params.requestId, auth.user.id);
  if (!claimResult.ok) {
    if (claimResult.code === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: claimResult.message } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: claimResult.code,
          message: claimResult.message,
          reviewerName: claimResult.reviewerName,
        },
      },
      { status: 409 }
    );
  }

  if (claimResult.claimed) {
    try {
      await createReviewAction({
        verificationId: claimResult.request.upload_id,
        reviewRequestId: claimResult.request.id,
        actorUserId: auth.user.id,
        actorRole: 'admin',
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

  const data = detailResult.request;

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

  const readOnly = claimResult.readOnly || data.status === 'approved' || data.status === 'rejected';

  return NextResponse.json(
    {
      data: {
        request: data,
        transcriptUrl,
        transcriptUrlError,
        readOnly,
      },
    },
    { status: 200 }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const parsedBody = updateSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsedBody.error.issues[0]?.message || 'Invalid input' } },
      { status: 400 }
    );
  }

  const { action, adminNotes } = parsedBody.data;

  const { data: reviewRequest, error: requestError } = await adminClient
    .from('admin_review_requests')
    .select(
      'id, upload_id, status, user_id, reviewed_by, grade_verifications(id, created_at, transcript_storage_bucket, transcript_storage_path)'
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

  const now = new Date().toISOString();
  const newReviewStatus = action === 'approve' ? 'approved' : 'rejected';
  const newVerificationStatus = action === 'approve' ? 'approved' : 'rejected';
  const rejectedRetentionUntil = action === 'reject' ? computeRejectedRetentionUntil(now) : null;
  const previousStatus = reviewRequest.status;

  const { data: updatedReview, error: reviewUpdateError } = await adminClient
    .from('admin_review_requests')
    .update({
      status: newReviewStatus,
      admin_notes: adminNotes || null,
      reviewed_by: reviewRequest.reviewed_by || auth.user.id,
      resolved_at: now,
      updated_at: now,
    })
    .eq('id', params.requestId)
    .in('status', ['pending', 'reviewing'])
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
      reviewer_note: adminNotes || null,
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
        actorRole: 'admin',
        actionType: action === 'approve' ? 'admin_approved' : 'admin_rejected',
        fromStatus: queueRecord.status,
        toStatus: newVerificationStatus,
        notes: adminNotes || null,
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
      adminNotes: adminNotes || null,
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
      },
    },
    { status: 200 }
  );
}
