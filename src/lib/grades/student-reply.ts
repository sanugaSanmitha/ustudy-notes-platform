import { randomUUID } from 'crypto';
import { adminClient } from '@/lib/supabase/admin';
import { gradeVerificationConfig } from '@/lib/grades/config';
import { resumeReviewAfterStudentReply } from '@/lib/grades/admin-review';
import { createReviewAction } from '@/lib/grades/review-pipeline';
import { deleteTranscriptFile, uploadTranscriptFile } from '@/lib/grades/transcript-storage';

export const MAX_STUDENT_REPLY_FILES = 5;

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']);

export type StudentReplyFile = {
  name: string;
  bucket: string;
  path: string;
  size: number;
  type: string;
};

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function fetchOpenAdminReviewForStudent(userId: string, verificationId?: string) {
  let query = adminClient
    .from('admin_review_requests')
    .select(
      'id, status, student_info_request, reviewed_by, assigned_to, upload_id, created_at, updated_at'
    )
    .eq('user_id', userId)
    .in('status', ['pending', 'reviewing', 'waiting_student', 'pending_reassignment', 'escalated'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (verificationId) {
    query = query.eq('upload_id', verificationId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw error;
  }

  return data;
}

export async function listStudentRepliesForReviewRequest(reviewRequestId: string) {
  const { data, error } = await adminClient
    .from('admin_review_student_replies')
    .select('id, message, files, created_at, user_id')
    .eq('review_request_id', reviewRequestId)
    .order('created_at', { ascending: false });

  if (error) {
    if (`${error.message}`.toLowerCase().includes('admin_review_student_replies')) {
      return [];
    }
    throw error;
  }

  return data || [];
}

export async function submitStudentReviewReply(options: {
  reviewRequestId: string;
  userId: string;
  message: string;
  files: File[];
}) {
  const trimmedMessage = options.message.trim();
  if (!trimmedMessage && options.files.length === 0) {
    return { ok: false as const, code: 'INVALID_INPUT' as const, message: 'Provide a message or upload at least one file.' };
  }

  if (options.files.length > MAX_STUDENT_REPLY_FILES) {
    return {
      ok: false as const,
      code: 'INVALID_INPUT' as const,
      message: `You can upload at most ${MAX_STUDENT_REPLY_FILES} files per reply.`,
    };
  }

  const { data: reviewRequest, error: fetchError } = await adminClient
    .from('admin_review_requests')
    .select('id, status, user_id, upload_id, reviewed_by, assigned_to, student_info_request')
    .eq('id', options.reviewRequestId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!reviewRequest || reviewRequest.user_id !== options.userId) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Review request not found.' };
  }

  if (reviewRequest.status !== 'waiting_student') {
    return {
      ok: false as const,
      code: 'INVALID_STATE' as const,
      message: 'This review is not waiting for your response.',
    };
  }

  const uploadedFiles: StudentReplyFile[] = [];
  let replacedTranscript = false;

  for (const file of options.files) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return {
        ok: false as const,
        code: 'INVALID_INPUT' as const,
        message: `Invalid file type for ${file.name}. Only PDF, JPG, and PNG are allowed.`,
      };
    }

    if (file.size > gradeVerificationConfig.maxFileSizeBytes) {
      return {
        ok: false as const,
        code: 'INVALID_INPUT' as const,
        message: `${file.name} exceeds the ${Math.round(gradeVerificationConfig.maxFileSizeBytes / (1024 * 1024))}MB limit.`,
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = sanitizeFilename(file.name || 'upload');
    const storagePath = `student-replies/${options.userId}/${options.reviewRequestId}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
    const storage = await uploadTranscriptFile(buffer, storagePath, file.type);

    uploadedFiles.push({
      name: file.name,
      bucket: storage.bucket,
      path: storage.path,
      size: file.size,
      type: file.type,
    });

    if (file.type === 'application/pdf' && !replacedTranscript) {
      const { data: verification } = await adminClient
        .from('grade_verifications')
        .select('transcript_storage_bucket, transcript_storage_path, transcript_filename')
        .eq('id', reviewRequest.upload_id)
        .maybeSingle();

      if (verification?.transcript_storage_bucket && verification?.transcript_storage_path) {
        try {
          await deleteTranscriptFile(verification.transcript_storage_bucket, verification.transcript_storage_path);
        } catch (deleteError) {
          console.error('Student reply transcript replace delete error:', deleteError);
        }
      }

      await adminClient
        .from('grade_verifications')
        .update({
          transcript_storage_bucket: storage.bucket,
          transcript_storage_path: storage.path,
          transcript_filename: file.name,
          transcript_storage_uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewRequest.upload_id);

      replacedTranscript = true;
    }
  }

  const replyMessage = trimmedMessage || 'Uploaded additional file(s) for review.';
  const { data: replyRow, error: insertError } = await adminClient
    .from('admin_review_student_replies')
    .insert({
      review_request_id: options.reviewRequestId,
      user_id: options.userId,
      message: replyMessage,
      files: uploadedFiles,
    })
    .select('id, created_at')
    .single();

  if (insertError) {
    return {
      ok: false as const,
      code: 'SCHEMA' as const,
      message: 'Run docs/migrations/021_student_replies.sql in Supabase SQL Editor.',
    };
  }

  const resumeResult = await resumeReviewAfterStudentReply(options.reviewRequestId);
  if (!resumeResult.ok) {
    return { ok: false as const, code: resumeResult.code, message: 'Failed to resume review after your reply.' };
  }

  try {
    await createReviewAction({
      verificationId: reviewRequest.upload_id,
      reviewRequestId: reviewRequest.id,
      actorUserId: options.userId,
      actorRole: 'system',
      actionType: 'student_replied',
      fromStatus: 'waiting_student',
      toStatus: 'reviewing',
      notes: replyMessage,
      afterPayload: {
        replyId: replyRow.id,
        fileCount: uploadedFiles.length,
        replacedTranscript,
      },
    });
  } catch (auditError) {
    console.error('Student reply audit error:', auditError);
  }

  return {
    ok: true as const,
    reply: replyRow,
    reviewerId: resumeResult.request.reviewed_by,
  };
}
