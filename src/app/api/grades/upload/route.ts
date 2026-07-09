import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { extractAndValidateTranscriptBuffer } from '@/lib/grades/parser';
import { deleteTranscriptFile, uploadTranscriptFile } from '@/lib/grades/transcript-storage';
import { createReviewAction, upsertParseQueue } from '@/lib/grades/review-pipeline';
import { gradeVerificationConfig, formatReuploadCooldownRemaining } from '@/lib/grades/config';
import { buildInitialReviewRows } from '@/lib/grades/review-model';
import { enrichCourseRows, findUnknownCourseCodes } from '@/lib/courses/catalog';
import {
  fetchVerifiedCourseCodeSet,
  filterCoursesNotAlreadyVerified,
} from '@/lib/grades/verified-courses';

export const dynamic = 'force-dynamic';

async function ensureUserProfile(user: { id: string; email?: string | null }) {
  if (!user.email) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: 'PROFILE_INCOMPLETE', message: 'Authenticated user does not have a valid email.' } },
        { status: 400 }
      ),
    };
  }

  const { error } = await adminClient
    .from('users')
    .upsert(
      {
        id: user.id,
        email: user.email.toLowerCase(),
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('Grade upload profile seed error:', error);
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: 'PROFILE_SEED_ERROR', message: 'Failed to prepare your profile for grade verification.' } },
        { status: 500 }
      ),
    };
  }

  return { ok: true };
}

function stripNullCharacters(value: string) {
  return value.replace(/\u0000/g, '').replace(/\\u0000/gi, '');
}

function sanitizeFilename(value: string) {
  return stripNullCharacters(value).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function sanitizeForPostgres<T>(value: T): T {
  if (typeof value === 'string') {
    return stripNullCharacters(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForPostgres(item)) as T;
  }

  if (value && typeof value === 'object') {
    const sanitizedEntries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      sanitizeForPostgres(entryValue),
    ]);
    return Object.fromEntries(sanitizedEntries) as T;
  }

  return value;
}

function formatGradeVerificationDbError(error: unknown, fallback: string) {
  const dbError = error as { code?: string; message?: string; details?: string | null; hint?: string | null } | null;
  const rawMessage = dbError?.message?.toLowerCase() ?? '';
  const rawDetails = dbError?.details?.toLowerCase() ?? '';
  const rawHint = dbError?.hint?.toLowerCase() ?? '';
  const combined = `${rawMessage} ${rawDetails} ${rawHint}`;

  if (
    combined.includes('permission denied') ||
    (dbError?.code === '42501' && combined.includes('grade_verifications'))
  ) {
    return 'Grade verification table permissions are missing. Run docs/migrations/007_grade_verifications.sql in Supabase SQL Editor.';
  }

  if (
    combined.includes('column') &&
    (combined.includes('parsed_transcript') ||
      combined.includes('parser_source') ||
      combined.includes('extraction_confidence') ||
      combined.includes('risk_score') ||
        combined.includes('verification_decision') ||
        combined.includes('transcript_storage_path') ||
        combined.includes('transcript_storage_bucket') ||
        combined.includes('review_rows') ||
        combined.includes('confirmation_required') ||
        combined.includes('auto_approval_eligible') ||
        combined.includes('rejected_retention_until'))
  ) {
    return 'Transcript verification columns are missing. Run docs/migrations/008_transcript_verification_pipeline.sql, docs/migrations/010_transcript_storage_fields.sql, and docs/migrations/013_grade_verification_confirmation_and_retention.sql in Supabase SQL Editor.';
  }

  if (combined.includes('relation') && combined.includes('grade_verifications')) {
    return 'Grade verification table is missing. Run docs/migrations/007_grade_verifications.sql in Supabase SQL Editor.';
  }

  return fallback;
}

function normalizeVerificationStatus(status: string): 'manual_required' | 'pending_review' | 'approved' | 'rejected' {
  if (status === 'manual_required' || status === 'pending_review' || status === 'approved' || status === 'rejected') {
    return status;
  }

  return 'pending_review';
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

    const profileResult = await ensureUserProfile(user);
    if (!profileResult.ok) {
      return profileResult.response;
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        {
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email before submitting a transcript.',
          },
        },
        { status: 400 }
      );
    }

    const { data: userProfile, error: userProfileError } = await adminClient
      .from('users')
      .select('profile_completed, full_name, is_seller')
      .eq('id', user.id)
      .maybeSingle();

    if (userProfileError) {
      console.error('Grade upload user profile fetch error:', userProfileError);
    }

    if (!userProfile?.profile_completed) {
      return NextResponse.json(
        {
          error: {
            code: 'PROFILE_INCOMPLETE',
            message: 'Please complete your profile before grade verification.',
          },
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const { data: existingApproved, error: approvedCheckError } = await adminClient
      .from('grade_verifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (approvedCheckError) {
      console.error('Grade upload approved-check error:', approvedCheckError);
    }

    const isGradeUpdate = Boolean(userProfile.is_seller || existingApproved);

    const { data: activeVerification, error: activeVerificationError } = await adminClient
      .from('grade_verifications')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending_review', 'manual_required'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeVerificationError) {
      console.error('Grade upload active-verification error:', activeVerificationError);
    }

    if (activeVerification) {
      return NextResponse.json(
        {
          error: {
            code: 'PENDING_VERIFICATION',
            message:
              'You already have a transcript submission in progress. Finish or cancel it before uploading another transcript.',
          },
        },
        { status: 409 }
      );
    }

    if (isGradeUpdate) {
      const { data: latestUpload, error: latestUploadError } = await adminClient
        .from('grade_verifications')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestUploadError) {
        console.error('Grade upload latest-upload error:', latestUploadError);
      }

      if (latestUpload?.created_at) {
        const elapsedMs = now.getTime() - new Date(latestUpload.created_at).getTime();
        const remainingMs = gradeVerificationConfig.reuploadCooldownMs - elapsedMs;
        if (remainingMs > 0) {
          return NextResponse.json(
            {
              error: {
                code: 'REUPLOAD_COOLDOWN',
                message: `Please wait ${formatReuploadCooldownRemaining(remainingMs)} before submitting another transcript.`,
                reuploadAvailableAt: new Date(now.getTime() + remainingMs).toISOString(),
                reuploadCooldownRemainingMs: remainingMs,
              },
            },
            { status: 429 }
          );
        }
      }
    }
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

    const { count: uploadsTodayCount, error: countError } = await adminClient
      .from('grade_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', dayStart);

    if (countError) {
      console.error('Grade upload count error:', countError);
      return NextResponse.json(
        { error: { code: 'UPLOAD_COUNT_ERROR', message: 'Failed to verify upload quota' } },
        { status: 500 }
      );
    }

    if ((uploadsTodayCount || 0) >= gradeVerificationConfig.maxUploadsPerDay) {
      return NextResponse.json(
        {
          error: {
            code: 'UPLOAD_LIMIT',
            message: `You can submit at most ${gradeVerificationConfig.maxUploadsPerDay} grade verifications per day.`,
          },
        },
        { status: 429 }
      );
    }

    const { count: failedAttemptsToday, error: failedAttemptsError } = await adminClient
      .from('grade_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', dayStart)
      .or('status.eq.manual_required,failed_parse_attempts.gt.0');

    if (failedAttemptsError) {
      console.error('Grade upload failed-attempt count error:', failedAttemptsError);
    }

    const retryLimitReached = (failedAttemptsToday || 0) >= gradeVerificationConfig.maxParseRetries;

    const formData = await request.formData();
    const transcript = formData.get('transcript');

    if (!(transcript instanceof File)) {
      return NextResponse.json(
        { error: { code: 'INVALID_FILE', message: 'Please upload a transcript PDF.' } },
        { status: 400 }
      );
    }

    if (transcript.type !== 'application/pdf') {
      return NextResponse.json(
        { error: { code: 'INVALID_FILE_TYPE', message: 'Only PDF files are supported.' } },
        { status: 400 }
      );
    }

    if (transcript.size > gradeVerificationConfig.maxFileSizeBytes) {
      return NextResponse.json(
        {
          error: {
            code: 'FILE_TOO_LARGE',
            message: `Transcript file must be ${Math.round(gradeVerificationConfig.maxFileSizeBytes / (1024 * 1024))}MB or smaller.`,
          },
        },
        { status: 400 }
      );
    }

    const transcriptBuffer = Buffer.from(await transcript.arrayBuffer());
    const verificationId = randomUUID();
    const transcriptStoragePath = `${user.id}/${verificationId}/${Date.now()}-${sanitizeFilename(transcript.name)}`;
    let transcriptStorageBucket: string | null = null;

    try {
      const storage = await uploadTranscriptFile(transcriptBuffer, transcriptStoragePath, transcript.type);
      transcriptStorageBucket = storage.bucket;
    } catch (storageError) {
      console.error('Transcript storage upload error:', storageError);
      return NextResponse.json(
        {
          error: {
            code: 'TRANSCRIPT_STORAGE_ERROR',
            message:
              'Failed to store transcript file for verification. Check Cloudflare R2/Supabase storage configuration and permissions.',
          },
        },
        { status: 500 }
      );
    }

    const pipelineResult = await extractAndValidateTranscriptBuffer(transcriptBuffer, {
      verifiedEmail: user.email || null,
      emailConfirmed: Boolean((user as { email_confirmed_at?: string | null }).email_confirmed_at),
      fullName: userProfile?.full_name || null,
    });
    const rawParsedCourseCount = pipelineResult.parse.courses.length;
    let existingVerifiedCourseCodes = new Set<string>();
    if (isGradeUpdate) {
      existingVerifiedCourseCodes = await fetchVerifiedCourseCodeSet(user.id);
    }

    const enrichedParsedCourses = await enrichCourseRows(pipelineResult.parse.courses);
    let parsedCourses = enrichedParsedCourses;
    let skippedDuplicateCount = 0;

    if (isGradeUpdate && parsedCourses.length > 0) {
      parsedCourses = filterCoursesNotAlreadyVerified(parsedCourses, existingVerifiedCourseCodes);
      skippedDuplicateCount = enrichedParsedCourses.length - parsedCourses.length;
    }

    const parseFailed = rawParsedCourseCount === 0;
    const noNewGradesFound = !parseFailed && parsedCourses.length === 0;

    if (noNewGradesFound) {
      try {
        await deleteTranscriptFile(transcriptStorageBucket, transcriptStoragePath);
      } catch (storageDeleteError) {
        console.error('Transcript storage delete error:', storageDeleteError);
      }

      return NextResponse.json(
        {
          data: {
            mode: 'no_new_grades',
            message:
              skippedDuplicateCount > 0
                ? `All ${skippedDuplicateCount} course(s) on this transcript are already verified. No new grades were added.`
                : 'No new grades were found on this transcript.',
            skippedDuplicateCount,
            isGradeUpdate,
          },
        },
        { status: 200 }
      );
    }

    const requiresManualInput = parseFailed;
    const unknownCatalogCodes = parseFailed
      ? []
      : await findUnknownCourseCodes(parsedCourses.map((course) => course.courseCode));
    let autoApprovalEligible =
      !parseFailed && !retryLimitReached && pipelineResult.verification.decision === 'auto_verify';
    if (unknownCatalogCodes.length > 0) {
      autoApprovalEligible = false;
    }
    const confirmationRequired = !requiresManualInput;
    const finalStatus = requiresManualInput ? 'manual_required' : 'pending_review';
    const reviewRows = requiresManualInput
      ? []
      : buildInitialReviewRows(
          parsedCourses.map((course) => ({
            courseCode: course.courseCode,
            courseName: course.courseName,
            grade: course.grade,
          })),
          pipelineResult.parse.extractionConfidence
        );
    const sanitizedTranscriptFilename = stripNullCharacters(transcript.name);
    const sanitizedTranscriptContentType = stripNullCharacters(transcript.type);
    const sanitizedParsedCourses = sanitizeForPostgres(parsedCourses);
    const sanitizedParsedTranscript = sanitizeForPostgres(pipelineResult.parse.extractedTranscript);
    const sanitizedParserSource = sanitizeForPostgres(pipelineResult.parse.source);
    const sanitizedExtractionQuality = sanitizeForPostgres(
      ((pipelineResult.parse.extractedTranscript.analysis as Record<string, unknown>)?.quality as Record<
        string,
        unknown
      >)?.textExtractionQuality || null
    );
    const sanitizedPdfMetadata = sanitizeForPostgres(pipelineResult.parse.metadata);
    const sanitizedRiskReasons = sanitizeForPostgres(pipelineResult.verification.reasons);
    const sanitizedRiskLevel = sanitizeForPostgres(pipelineResult.verification.riskLevel);
    const sanitizedVerificationDecision = sanitizeForPostgres(pipelineResult.verification.decision);
    const extractionQuality =
      ((pipelineResult.parse.extractedTranscript.analysis as Record<string, unknown>)?.quality as Record<string, unknown>)
        ?.textExtractionQuality || null;
    const lowQualityExtraction = String(extractionQuality || '').toUpperCase() === 'LOW';
    const manualFailureReason = requiresManualInput
      ? pipelineResult.parse.rawTextLength < 120
        ? 'We could not extract enough readable text from this PDF.'
        : lowQualityExtraction
          ? 'The PDF text layer appears unreadable/compressed for automatic parsing.'
          : `Text was extracted but no valid course-grade pairs were detected (source: ${pipelineResult.parse.source}).`
      : null;

    const { data: inserted, error: insertError } = await adminClient
      .from('grade_verifications')
      .insert({
        id: verificationId,
        user_id: user.id,
        status: finalStatus,
        submission_type: requiresManualInput ? 'pdf_manual' : 'pdf_auto',
        transcript_filename: sanitizedTranscriptFilename,
        transcript_content_type: sanitizedTranscriptContentType,
        transcript_size_bytes: transcript.size,
        parsed_courses: requiresManualInput ? null : sanitizedParsedCourses,
        review_rows: requiresManualInput ? null : sanitizeForPostgres(reviewRows),
        auto_approval_eligible: autoApprovalEligible,
        confirmation_required: confirmationRequired,
        parsed_transcript: sanitizedParsedTranscript,
        parser_source: sanitizedParserSource,
        extraction_confidence: pipelineResult.parse.extractionConfidence,
        extraction_quality: sanitizedExtractionQuality,
        pdf_metadata: sanitizedPdfMetadata,
        risk_score: pipelineResult.verification.riskScore,
        risk_level: sanitizedRiskLevel,
        risk_reasons: sanitizedRiskReasons,
        verification_decision: sanitizedVerificationDecision,
        parse_attempts: String(pipelineResult.parse.source || '').toLowerCase().includes('regex') ? 2 : 1,
        failed_parse_attempts: parseFailed ? Math.min((failedAttemptsToday || 0) + 1, gradeVerificationConfig.maxParseRetries + 1) : 0,
        transcript_storage_bucket: transcriptStorageBucket,
        transcript_storage_path: transcriptStoragePath,
        transcript_storage_uploaded_at: new Date().toISOString(),
      })
      .select(
        'id, status, parsed_courses, review_rows, auto_approval_eligible, confirmation_required, risk_score, risk_level, verification_decision, created_at'
      )
      .single();

    if (insertError || !inserted) {
      console.error('Grade upload insert error:', insertError);
      try {
        await deleteTranscriptFile(transcriptStorageBucket, transcriptStoragePath);
      } catch (storageDeleteError) {
        console.error('Transcript storage delete error:', storageDeleteError);
      }
      const formattedMessage = formatGradeVerificationDbError(insertError, 'Failed to save grade submission');
      const detail =
        process.env.NODE_ENV === 'production'
          ? null
          : {
              message: insertError?.message || 'Unknown database insert failure',
              code: insertError?.code || null,
              hint: insertError?.hint || null,
              details: insertError?.details || null,
            };
      return NextResponse.json(
        { error: { code: 'UPLOAD_SAVE_ERROR', message: formattedMessage, detail } },
        { status: 500 }
      );
    }

    try {
      if (requiresManualInput) {
        await upsertParseQueue({
          verificationId: inserted.id,
          userId: user.id,
          verificationStatus: normalizeVerificationStatus(inserted.status),
          extractionConfidence: pipelineResult.parse.extractionConfidence,
          aiResultJson: sanitizedParsedTranscript,
          parserSource: String(sanitizedParserSource || ''),
          failureReason: manualFailureReason,
        });
      }

      await createReviewAction({
        verificationId: inserted.id,
        actorRole: 'system',
        actionType: 'upload_parsed',
        toStatus: inserted.status,
        afterPayload: {
          riskLevel: pipelineResult.verification.riskLevel,
          riskScore: pipelineResult.verification.riskScore,
          decision: pipelineResult.verification.decision,
          parserSource: pipelineResult.parse.source,
          autoApprovalEligible,
          confirmationRequired,
        },
      });
    } catch (queueError) {
      console.error('Grade upload queue upsert error:', queueError);
    }

    if (requiresManualInput) {
      const manualReason = pipelineResult.parse.rawTextLength < 120
        ? 'We could not extract enough readable text from this PDF.'
        : lowQualityExtraction
          ? 'The PDF text layer appears unreadable/compressed for automatic parsing. Please export a text-searchable PDF and upload again, or submit grades manually below.'
          : retryLimitReached
            ? `You reached the automatic parsing retry limit (${gradeVerificationConfig.maxParseRetries}). Please submit grades manually or request admin review.`
            : `Text was extracted but no valid course-grade pairs were detected (source: ${pipelineResult.parse.source}).`;
      return NextResponse.json(
        {
          data: {
            mode: 'manual_required',
            verificationId: inserted.id,
            status: inserted.status,
            riskScore: pipelineResult.verification.riskScore,
            riskLevel: pipelineResult.verification.riskLevel,
            decision: pipelineResult.verification.decision,
            academicSummary: pipelineResult.parse.summary,
            message: `We could not parse your transcript automatically. ${manualReason} Please submit your course grades manually.`,
            remainingUploadsToday: gradeVerificationConfig.maxUploadsPerDay - ((uploadsTodayCount || 0) + 1),
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        data: {
          mode: 'parsed',
          verificationId: inserted.id,
          status: inserted.status,
          courses: inserted.parsed_courses || [],
          reviewRows: inserted.review_rows || [],
          autoApprovalEligible: Boolean(inserted.auto_approval_eligible),
          confirmationRequired: Boolean(inserted.confirmation_required),
          retryLimitReached,
          academicSummary: pipelineResult.parse.summary,
          parserSource: pipelineResult.parse.source,
          riskScore: inserted.risk_score,
          riskLevel: inserted.risk_level,
          decision: inserted.verification_decision,
          message: retryLimitReached
            ? 'Transcript parsed, but automatic approval is disabled after retry limit. Please request admin review.'
            : isGradeUpdate
              ? `Found ${parsedCourses.length} new course(s) to add. Existing verified grades were not changed.${skippedDuplicateCount > 0 ? ` ${skippedDuplicateCount} duplicate course(s) were ignored.` : ''} Please review and confirm.`
              : 'Transcript parsed successfully. Please review courses and confirm before final approval.',
          remainingUploadsToday: gradeVerificationConfig.maxUploadsPerDay - ((uploadsTodayCount || 0) + 1),
          isGradeUpdate,
          skippedDuplicateCount,
          newCourseCount: parsedCourses.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Grade upload error:', error);
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('Missing required server environment variables')) {
      return NextResponse.json(
        {
          error: {
            code: 'SERVER_CONFIG_ERROR',
            message: errorMessage,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to upload transcript' } },
      { status: 500 }
    );
  }
}
