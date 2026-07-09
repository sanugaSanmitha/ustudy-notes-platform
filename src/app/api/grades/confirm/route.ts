import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { createReviewAction, upsertParseQueue } from '@/lib/grades/review-pipeline';
import {
  CourseReviewRow,
  sanitizeCourseReviewRows,
  summarizeReviewRows,
  toNormalizedCourses,
} from '@/lib/grades/review-model';
import { deleteTranscriptFile } from '@/lib/grades/transcript-storage';
import { sendGradeVerificationApprovedEmail } from '@/lib/email/resend';
import { syncVerifiedCoursesForApproval } from '@/lib/grades/verified-courses';
import { enrichCourseRows } from '@/lib/courses/catalog';

const rowSchema = z.object({
  id: z.string().uuid().optional(),
  source: z.enum(['ai', 'user_added']),
  edited: z.boolean(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  courseCode: z.string().trim().min(4).max(16),
  courseName: z.string().trim().max(160).optional().default(''),
  grade: z.string().trim().min(1).max(4),
});

const confirmSchema = z.object({
  verificationId: z.string().uuid(),
  reviewRows: z.array(rowSchema).min(1).max(80),
});

function buildTranscriptId(verificationId: string, createdAt: string) {
  const year = new Date(createdAt).getUTCFullYear();
  return `TR-${year}-${verificationId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const parsedBody = confirmSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: parsedBody.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const { verificationId } = parsedBody.data;
    const rows = sanitizeCourseReviewRows(await enrichCourseRows(parsedBody.data.reviewRows as CourseReviewRow[]));
    const summary = summarizeReviewRows(rows);

    const { data: verification, error: fetchError } = await adminClient
      .from('grade_verifications')
      .select(
        'id, user_id, status, auto_approval_eligible, confirmation_required, transcript_storage_bucket, transcript_storage_path, created_at'
      )
      .eq('id', verificationId)
      .maybeSingle();

    if (fetchError) {
      console.error('Grade confirm fetch error:', fetchError);
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: 'Failed to load verification record.' } },
        { status: 500 }
      );
    }

    if (!verification || verification.user_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Verification record not found.' } },
        { status: 404 }
      );
    }

    if (verification.status !== 'pending_review' || !verification.confirmation_required) {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: 'This submission cannot be confirmed right now.' } },
        { status: 400 }
      );
    }

    if (!summary.hasOnlyGreen) {
      return NextResponse.json(
        {
          error: {
            code: 'REQUIRES_MANUAL_REVIEW',
            message:
              'Rows include edits or user-added courses. Please request admin review instead of automatic confirmation.',
          },
        },
        { status: 409 }
      );
    }

    if (!verification.auto_approval_eligible) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_AUTO_APPROVAL_ELIGIBLE',
            message: 'This transcript requires manual review due to verification risk checks.',
          },
        },
        { status: 409 }
      );
    }

    const normalizedCourses = toNormalizedCourses(rows);
    const now = new Date().toISOString();

    const { data: userProfileBefore } = await adminClient
      .from('users')
      .select('is_seller')
      .eq('id', user.id)
      .maybeSingle();
    const wasAlreadyVerified = Boolean(userProfileBefore?.is_seller);

    const { error: verificationUpdateError } = await adminClient
      .from('grade_verifications')
      .update({
        status: 'approved',
        parsed_courses: normalizedCourses,
        review_rows: rows,
        confirmation_required: false,
        confirmation_completed_at: now,
        approved_at: now,
        reviewed_at: now,
        updated_at: now,
        rejected_retention_until: null,
      })
      .eq('id', verificationId);

    if (verificationUpdateError) {
      console.error('Grade confirm verification update error:', verificationUpdateError);
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: 'Failed to confirm transcript verification.' } },
        { status: 500 }
      );
    }

    const { error: sellerUpdateError } = await adminClient
      .from('users')
      .update({
        is_seller: true,
        updated_at: now,
      })
      .eq('id', user.id);
    if (sellerUpdateError) {
      console.error('Grade confirm seller update error:', sellerUpdateError);
    }

    let syncResult = { synced: 0, skipped: 0 };
    try {
      syncResult = await syncVerifiedCoursesForApproval(verificationId, user.id);
    } catch (syncError) {
      console.error('Verified courses sync error:', syncError);
    }

    try {
      await upsertParseQueue({
        verificationId,
        userId: user.id,
        verificationStatus: 'approved',
        extractionConfidence: 1,
        aiResultJson: { rows, source: 'user_confirmation' },
        parserSource: 'user_confirmation',
        failureReason: null,
      });

      await createReviewAction({
        verificationId,
        actorUserId: user.id,
        actorRole: 'system',
        actionType: 'user_confirmed_auto_approval',
        fromStatus: 'pending_review',
        toStatus: 'approved',
        afterPayload: { greenRows: summary.green },
      });
    } catch (queueError) {
      console.error('Grade confirm queue/action error:', queueError);
    }

    if (verification.transcript_storage_bucket && verification.transcript_storage_path) {
      try {
        await deleteTranscriptFile(verification.transcript_storage_bucket, verification.transcript_storage_path);
      } catch (storageDeleteError) {
        console.error('Grade confirm storage delete error:', storageDeleteError);
      }
    }

    const { error: clearStorageRefError } = await adminClient
      .from('grade_verifications')
      .update({
        transcript_storage_bucket: null,
        transcript_storage_path: null,
        transcript_storage_uploaded_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verificationId);
    if (clearStorageRefError) {
      console.error('Grade confirm storage reference clear error:', clearStorageRefError);
    }

    if (user.email) {
      const { data: profile } = await adminClient
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      void sendGradeVerificationApprovedEmail({
        studentEmail: user.email,
        studentName: profile?.full_name || user.email,
        transcriptId: buildTranscriptId(verification.id, verification.created_at),
      });
    }

    const successMessage = wasAlreadyVerified
      ? syncResult.synced > 0
        ? `${syncResult.synced} new course(s) added to your verified record. Existing grades were not changed.`
        : 'Transcript processed. All courses were already verified — no new grades were added.'
      : 'Transcript verified successfully. Seller access has been enabled.';

    return NextResponse.json(
      {
        data: {
          verificationId,
          status: 'approved',
          message: successMessage,
          newCoursesAdded: syncResult.synced,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Grade confirm error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm transcript verification.' } },
      { status: 500 }
    );
  }
}
