import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { createReviewAction, upsertParseQueue } from '@/lib/grades/review-pipeline';
import { deleteTranscriptFile } from '@/lib/grades/transcript-storage';
import { enrichCourseRows } from '@/lib/courses/catalog';
import { isValidManualSubmissionGrade } from '@/lib/grades/course-validation';
import { buildManualReviewRows } from '@/lib/grades/review-model';

const manualSubmissionSchema = z.object({
  verificationId: z.string().uuid(),
  courses: z
    .array(
      z.object({
        courseCode: z.string().trim().min(4).max(16),
        courseName: z.string().trim().max(120).optional(),
        grade: z
          .string()
          .trim()
          .refine(isValidManualSubmissionGrade, 'Grade must be A+, A, A-, B+, B, or B-.'),
      })
    )
    .min(1, 'At least one course is required')
    .max(30, 'Too many courses'),
  screenshotUrl: z.string().trim().url().optional(),
  notes: z.string().trim().max(1000).optional(),
});

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

    const parsed = manualSubmissionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const { verificationId, courses, screenshotUrl, notes } = parsed.data;

    const { data: existing, error: fetchError } = await adminClient
      .from('grade_verifications')
      .select('id, user_id, status, transcript_storage_bucket, transcript_storage_path')
      .eq('id', verificationId)
      .maybeSingle();

    if (fetchError) {
      console.error('Manual grade fetch error:', fetchError);
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: 'Failed to load grade verification' } },
        { status: 500 }
      );
    }

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Grade verification request not found.' } },
        { status: 404 }
      );
    }

    if (existing.status !== 'manual_required') {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: 'Manual submission is not required for this request.' } },
        { status: 400 }
      );
    }

    const normalizedCourses = await enrichCourseRows(
      courses.map((course) => ({
        courseCode: course.courseCode.toUpperCase().replace(/\s+/g, ''),
        courseName: (course.courseName || '').trim(),
        grade: course.grade.toUpperCase(),
      }))
    );

    const reviewRows = buildManualReviewRows(normalizedCourses);

    const { data: updated, error: updateError } = await adminClient
      .from('grade_verifications')
      .update({
        manual_courses: normalizedCourses,
        review_rows: reviewRows,
        screenshot_url: screenshotUrl || null,
        notes: notes || null,
        submission_type: 'manual',
        status: 'pending_review',
        transcript_storage_bucket: null,
        transcript_storage_path: null,
        transcript_storage_uploaded_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verificationId)
      .select('id, status')
      .single();

    if (updateError || !updated) {
      console.error('Manual grade update error:', updateError);
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: 'Failed to submit manual grade details' } },
        { status: 500 }
      );
    }

    if (existing.transcript_storage_bucket && existing.transcript_storage_path) {
      try {
        await deleteTranscriptFile(existing.transcript_storage_bucket, existing.transcript_storage_path);
      } catch (storageDeleteError) {
        console.error('Manual submit storage delete error:', storageDeleteError);
      }
    }

    try {
      await upsertParseQueue({
        verificationId: updated.id,
        userId: user.id,
        verificationStatus: 'pending_review',
        extractionConfidence: 0,
        aiResultJson: {
          source: 'manual_submission',
          courses: normalizedCourses,
        },
        parserSource: 'manual_submission',
        failureReason: null,
      });

      await createReviewAction({
        verificationId: updated.id,
        actorUserId: user.id,
        actorRole: 'system',
        actionType: 'manual_submission',
        fromStatus: 'manual_required',
        toStatus: 'pending_review',
        notes: notes || null,
        afterPayload: {
          manualCourseCount: normalizedCourses.length,
          screenshotProvided: Boolean(screenshotUrl),
        },
      });
    } catch (queueError) {
      console.error('Manual grade queue update error:', queueError);
    }

    return NextResponse.json(
      {
        data: {
          verificationId: updated.id,
          status: updated.status,
          message: 'Manual grade submission received. Your verification is pending review.',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Manual grade submission error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit manual grade details' } },
      { status: 500 }
    );
  }
}
