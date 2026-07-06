import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { sendAdminReviewRequestEmail } from '@/lib/email/resend';
import { createReviewAction, upsertParseQueue } from '@/lib/grades/review-pipeline';
import {
  CourseReviewRow,
  sanitizeCourseReviewRows,
  summarizeReviewRows,
  toNormalizedCourses,
} from '@/lib/grades/review-model';

const requestSchema = z.object({
  verificationId: z.string().uuid(),
  issueType: z.enum([
    'incorrect_grades',
    'missing_courses',
    'wrong_student_info',
    'format_not_supported',
    'other',
  ]),
  message: z.string().trim().max(500).optional(),
  externalTranscriptUrl: z.string().trim().url().max(1000).optional(),
  ownershipConfirmed: z.boolean(),
  courseRows: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        source: z.enum(['ai', 'user_added']),
        edited: z.boolean(),
        confidence: z.number().min(0).max(1).nullable().optional(),
        courseCode: z.string().trim().min(4).max(16),
        courseName: z.string().trim().max(160).optional().default(''),
        grade: z.string().trim().min(1).max(4),
      })
    )
    .max(80)
    .optional(),
});

const ISSUE_LABELS: Record<z.infer<typeof requestSchema>['issueType'], string> = {
  incorrect_grades: 'AI extracted incorrect grades',
  missing_courses: 'Some courses are missing',
  wrong_student_info: 'Wrong student information',
  format_not_supported: 'My transcript format is different',
  other: 'Other',
};

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

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const { verificationId, issueType, message, externalTranscriptUrl, ownershipConfirmed } = parsed.data;
    const parsedCourseRows = parsed.data.courseRows
      ? sanitizeCourseReviewRows(parsed.data.courseRows as CourseReviewRow[])
      : null;
    const parsedCourseSummary = parsedCourseRows ? summarizeReviewRows(parsedCourseRows) : null;
    if (!ownershipConfirmed) {
      return NextResponse.json(
        {
          error: {
            code: 'OWNERSHIP_CONFIRMATION_REQUIRED',
            message:
              'Please confirm ownership and consent to storing this transcript for manual review before sending a request.',
          },
        },
        { status: 400 }
      );
    }

    const { data: verification, error: verificationError } = await adminClient
      .from('grade_verifications')
      .select(
        'id, user_id, status, confirmation_required, auto_approval_eligible, created_at, transcript_filename, transcript_storage_bucket, transcript_storage_path'
      )
      .eq('id', verificationId)
      .maybeSingle();

    if (verificationError) {
      console.error('Admin review verification fetch error:', verificationError);
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: 'Failed to load transcript verification data.' } },
        { status: 500 }
      );
    }

    if (!verification || verification.user_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transcript verification record not found.' } },
        { status: 404 }
      );
    }

    const canRequestFromManualRequired = verification.status === 'manual_required';
    const canRequestFromPendingConfirmation =
      verification.status === 'pending_review' && Boolean(verification.confirmation_required);
    if (!canRequestFromManualRequired && !canRequestFromPendingConfirmation) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATE',
            message: 'Admin review can only be requested during manual input or pending confirmation.',
          },
        },
        { status: 400 }
      );
    }

    if (canRequestFromPendingConfirmation && (!parsedCourseSummary || !parsedCourseSummary.hasNeedsReview)) {
      const requiresRiskReview = verification.auto_approval_eligible === false;
      if (!requiresRiskReview) {
        return NextResponse.json(
          {
            error: {
              code: 'REVIEW_ROWS_REQUIRED',
              message: 'Please include edited or added course rows when requesting admin review.',
            },
          },
          { status: 400 }
        );
      }
    }

    if (!verification.transcript_storage_bucket || !verification.transcript_storage_path) {
      return NextResponse.json(
        {
          error: {
            code: 'TRANSCRIPT_NOT_AVAILABLE',
            message:
              'Transcript file is no longer available for manual review. Please upload your transcript again and then request review.',
          },
        },
        { status: 409 }
      );
    }

    const { data: existingRequest, error: existingRequestError } = await adminClient
      .from('admin_review_requests')
      .select('id, status')
      .eq('upload_id', verificationId)
      .in('status', ['pending', 'reviewing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRequestError) {
      console.error('Admin review existing request fetch error:', existingRequestError);
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: 'Failed to validate existing admin review requests.' } },
        { status: 500 }
      );
    }

    if (existingRequest) {
      return NextResponse.json(
        {
          error: {
            code: 'REQUEST_ALREADY_OPEN',
            message: 'An admin review request is already in progress for this transcript.',
          },
        },
        { status: 409 }
      );
    }

    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('full_name, school, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Admin review profile fetch error:', profileError);
    }

    const { data: insertedRequest, error: insertError } = await adminClient
      .from('admin_review_requests')
      .insert({
        user_id: user.id,
        upload_id: verificationId,
        issue_type: issueType,
        message: message || null,
        external_transcript_url: externalTranscriptUrl || null,
        status: 'pending',
      })
      .select('id, status, created_at')
      .single();

    if (insertError || !insertedRequest) {
      console.error('Admin review request insert error:', insertError);
      return NextResponse.json(
        { error: { code: 'SAVE_ERROR', message: 'Failed to create admin review request.' } },
        { status: 500 }
      );
    }

    const { error: verificationStatusUpdateError } = await adminClient
      .from('grade_verifications')
      .update({
        status: 'pending_review',
        confirmation_required: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verificationId);
    if (verificationStatusUpdateError) {
      console.error('Admin review verification status update error:', verificationStatusUpdateError);
    }

    if (canRequestFromPendingConfirmation && parsedCourseRows) {
      const { error: verificationUpdateError } = await adminClient
        .from('grade_verifications')
        .update({
          manual_courses: toNormalizedCourses(parsedCourseRows),
          review_rows: parsedCourseRows,
          submission_type: 'pdf_manual',
          confirmation_required: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', verificationId);
      if (verificationUpdateError) {
        console.error('Admin review verification row update error:', verificationUpdateError);
      }
    }

    try {
      await upsertParseQueue({
        verificationId,
        userId: user.id,
        verificationStatus: 'pending_review',
        extractionConfidence: 0,
        aiResultJson: parsedCourseRows ? { rows: parsedCourseRows, source: 'user_review_request' } : null,
        parserSource: 'manual_review_request',
        failureReason: ISSUE_LABELS[issueType],
      });

      const { data: queueRow } = await adminClient
        .from('grade_parse_queue')
        .select('id')
        .eq('verification_id', verificationId)
        .maybeSingle();

      await createReviewAction({
        verificationId,
        queueId: queueRow?.id || null,
        reviewRequestId: insertedRequest.id,
        actorUserId: user.id,
        actorRole: 'system',
        actionType: 'admin_review_requested',
        fromStatus: canRequestFromPendingConfirmation ? 'pending_review' : verification.status,
        toStatus: 'queued_manual_fallback',
        notes: message || null,
        afterPayload: {
          issueType,
          requestId: insertedRequest.id,
        },
      });
    } catch (queueError) {
      console.error('Admin review queue update error:', queueError);
    }

    const adminReviewEmail = process.env.ADMIN_REVIEW_EMAIL?.trim();
    if (adminReviewEmail) {
      const transcriptId = buildTranscriptId(verification.id, verification.created_at);
      const uploadDate = new Date(verification.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      void sendAdminReviewRequestEmail({
        adminEmail: adminReviewEmail,
        studentName: profile?.full_name || user.email || 'Student',
        studentEmail: user.email || profile?.email || 'Unknown',
        university: profile?.school || 'HKUST',
        uploadDate,
        transcriptId,
        issueType: ISSUE_LABELS[issueType],
        userMessage: message?.trim() || '',
        transcriptFilename: verification.transcript_filename || 'Transcript.pdf',
        externalTranscriptUrl: externalTranscriptUrl?.trim() || undefined,
      }).then((emailResult) => {
        if (!emailResult.success) {
          console.error('Admin review email failed; request is still recorded.');
        }
      });
    }

    return NextResponse.json(
      {
        data: {
          requestId: insertedRequest.id,
          status: insertedRequest.status,
          message: 'Admin review request sent. Our team will review your transcript shortly.',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin review request error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit admin review request.' } },
      { status: 500 }
    );
  }
}
