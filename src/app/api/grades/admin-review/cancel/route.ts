import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { createReviewAction } from '@/lib/grades/review-pipeline';
import { deleteTranscriptFile } from '@/lib/grades/transcript-storage';

const cancelSchema = z.object({
  verificationId: z.string().uuid(),
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

    const parsed = cancelSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const { verificationId } = parsed.data;
    const { data: verification, error: verificationError } = await adminClient
      .from('grade_verifications')
      .select('id, user_id, status, transcript_storage_bucket, transcript_storage_path')
      .eq('id', verificationId)
      .maybeSingle();

    if (verificationError) {
      console.error('Admin review cancel fetch error:', verificationError);
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

    if (verification.status !== 'manual_required') {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: 'Only manual-required records can be cancelled.' } },
        { status: 400 }
      );
    }

    const { error: reviewRequestCleanupError } = await adminClient
      .from('admin_review_requests')
      .delete()
      .eq('upload_id', verification.id)
      .in('status', ['pending', 'reviewing']);

    if (reviewRequestCleanupError) {
      console.error('Admin review cancel request cleanup error:', reviewRequestCleanupError);
    }

    if (verification.transcript_storage_bucket && verification.transcript_storage_path) {
      try {
        await deleteTranscriptFile(verification.transcript_storage_bucket, verification.transcript_storage_path);
      } catch (storageDeleteError) {
        console.error('Admin review cancel storage delete error:', storageDeleteError);
      }
    }

    const { error: updateError } = await adminClient
      .from('grade_verifications')
      .update({
        transcript_storage_bucket: null,
        transcript_storage_path: null,
        transcript_storage_uploaded_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verification.id);

    if (updateError) {
      console.error('Admin review cancel verification update error:', updateError);
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: 'Failed to clear transcript file.' } },
        { status: 500 }
      );
    }

    const { data: queueRow, error: queueError } = await adminClient
      .from('grade_parse_queue')
      .select('id, status')
      .eq('verification_id', verification.id)
      .maybeSingle();
    if (queueError) {
      console.error('Admin review cancel queue fetch error:', queueError);
    } else if (queueRow) {
      const { error: queueUpdateError } = await adminClient
        .from('grade_parse_queue')
        .update({
          status: 'reupload_required',
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueRow.id);
      if (queueUpdateError) {
        console.error('Admin review cancel queue update error:', queueUpdateError);
      }

      try {
        await createReviewAction({
          verificationId: verification.id,
          queueId: queueRow.id,
          actorUserId: user.id,
          actorRole: 'system',
          actionType: 'manual_review_cancelled',
          fromStatus: queueRow.status,
          toStatus: 'reupload_required',
        });
      } catch (logError) {
        console.error('Admin review cancel action log error:', logError);
      }
    }

    return NextResponse.json(
      {
        data: {
          verificationId: verification.id,
          message: 'Transcript file deleted. No manual review request was submitted.',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin review cancel error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel manual review.' } },
      { status: 500 }
    );
  }
}
