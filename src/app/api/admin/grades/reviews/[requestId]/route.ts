import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/grades/admin';
import { createReviewAction } from '@/lib/grades/review-pipeline';
import { createTranscriptSignedUrl, deleteTranscriptFile } from '@/lib/grades/transcript-storage';

const updateSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNotes: z.string().trim().max(1000).optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const { data, error } = await adminClient
    .from('admin_review_requests')
    .select(
      'id, issue_type, message, external_transcript_url, status, admin_notes, created_at, updated_at, resolved_at, upload_id, user_id, grade_verifications(id, status, transcript_filename, transcript_storage_bucket, transcript_storage_path, parsed_courses, manual_courses, parsed_transcript, risk_level, risk_score, risk_reasons, reviewer_note, created_at), users(full_name, email)'
    )
    .eq('id', params.requestId)
    .maybeSingle();

  if (error) {
    console.error('Admin review detail fetch error:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch admin review request.' } },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Admin review request not found.' } },
      { status: 404 }
    );
  }

  let transcriptUrl: string | null = null;
  let transcriptUrlError: string | null = null;
  const bucket = (data as { grade_verifications?: { transcript_storage_bucket?: string | null } | null }).grade_verifications
    ?.transcript_storage_bucket;
  const path = (data as { grade_verifications?: { transcript_storage_path?: string | null } | null }).grade_verifications
    ?.transcript_storage_path;
  if (bucket && path) {
    try {
      transcriptUrl = await createTranscriptSignedUrl(bucket, path, 60 * 30);
    } catch (signedError) {
      console.error('Admin review signed URL error:', signedError);
      transcriptUrlError = signedError instanceof Error ? signedError.message : 'Failed to generate transcript access URL.';
    }
  } else {
    transcriptUrlError = 'Transcript file is not stored for this review request.';
  }

  return NextResponse.json({ data: { request: data, transcriptUrl, transcriptUrlError } }, { status: 200 });
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
      'id, upload_id, status, grade_verifications(transcript_storage_bucket, transcript_storage_path)'
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

  const now = new Date().toISOString();
  const newReviewStatus = action === 'approve' ? 'approved' : 'rejected';
  const newVerificationStatus = action === 'approve' ? 'approved' : 'rejected';

  const { error: reviewUpdateError } = await adminClient
    .from('admin_review_requests')
    .update({
      status: newReviewStatus,
      admin_notes: adminNotes || null,
      resolved_at: now,
      updated_at: now,
    })
    .eq('id', params.requestId);

  if (reviewUpdateError) {
    console.error('Admin review update error:', reviewUpdateError);
    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message: 'Failed to update review request.' } },
      { status: 500 }
    );
  }

  const { error: verificationUpdateError } = await adminClient
    .from('grade_verifications')
    .update({
      status: newVerificationStatus,
      reviewer_note: adminNotes || null,
      reviewed_at: now,
      transcript_storage_bucket: null,
      transcript_storage_path: null,
      transcript_storage_uploaded_at: null,
      updated_at: now,
    })
    .eq('id', reviewRequest.upload_id);

  if (verificationUpdateError) {
    console.error('Admin verification update error:', verificationUpdateError);
    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message: 'Failed to update transcript verification status.' } },
      { status: 500 }
    );
  }

  const { data: queueRecord, error: queueFetchError } = await adminClient
    .from('grade_parse_queue')
    .select('id, status')
    .eq('verification_id', reviewRequest.upload_id)
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
        verificationId: reviewRequest.upload_id,
        queueId: queueRecord.id,
        reviewRequestId: reviewRequest.id,
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

  const transcriptBucket = (reviewRequest as { grade_verifications?: { transcript_storage_bucket?: string | null } | null })
    .grade_verifications?.transcript_storage_bucket;
  const transcriptPath = (reviewRequest as { grade_verifications?: { transcript_storage_path?: string | null } | null })
    .grade_verifications?.transcript_storage_path;
  if (transcriptBucket && transcriptPath) {
    try {
      await deleteTranscriptFile(transcriptBucket, transcriptPath);
    } catch (storageDeleteError) {
      console.error('Admin review resolve storage delete error:', storageDeleteError);
    }
  }

  return NextResponse.json(
    {
      data: {
        requestId: reviewRequest.id,
        status: newReviewStatus,
        verificationStatus: newVerificationStatus,
      },
    },
    { status: 200 }
  );
}
