import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { extractAndValidateTranscriptBuffer } from '@/lib/grades/parser';
import { deleteTranscriptFile, uploadTranscriptFile } from '@/lib/grades/transcript-storage';
import { createReviewAction, upsertParseQueue } from '@/lib/grades/review-pipeline';

const MAX_UPLOADS_PER_DAY = 50;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
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

function mapDecisionToStatus(decision: 'auto_verify' | 'manual_review' | 'reject') {
  if (decision === 'auto_verify') {
    return 'approved' as const;
  }
  return 'pending_review' as const;
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
        combined.includes('transcript_storage_bucket'))
  ) {
    return 'Transcript verification columns are missing. Run docs/migrations/008_transcript_verification_pipeline.sql and docs/migrations/010_transcript_storage_fields.sql in Supabase SQL Editor.';
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

    const now = new Date();
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

    if ((uploadsTodayCount || 0) >= MAX_UPLOADS_PER_DAY) {
      return NextResponse.json(
        { error: { code: 'UPLOAD_LIMIT', message: 'You can submit at most 50 grade verifications per day.' } },
        { status: 429 }
      );
    }

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

    if (transcript.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: { code: 'FILE_TOO_LARGE', message: 'Transcript file must be 10MB or smaller.' } },
        { status: 400 }
      );
    }

    const { data: profile, error: profileFetchError } = await adminClient
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileFetchError) {
      console.error('Grade upload profile fetch error:', profileFetchError);
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
      fullName: profile?.full_name || null,
    });
    const parsedCourses = pipelineResult.parse.courses;
    const requiresManualInput = parsedCourses.length === 0;
    const finalStatus = requiresManualInput
      ? 'manual_required'
      : mapDecisionToStatus(pipelineResult.verification.decision);
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
        parsed_transcript: sanitizedParsedTranscript,
        parser_source: sanitizedParserSource,
        extraction_confidence: pipelineResult.parse.extractionConfidence,
        extraction_quality: sanitizedExtractionQuality,
        pdf_metadata: sanitizedPdfMetadata,
        risk_score: pipelineResult.verification.riskScore,
        risk_level: sanitizedRiskLevel,
        risk_reasons: sanitizedRiskReasons,
        verification_decision: sanitizedVerificationDecision,
        transcript_storage_bucket: transcriptStorageBucket,
        transcript_storage_path: transcriptStoragePath,
        transcript_storage_uploaded_at: new Date().toISOString(),
        reviewed_at: finalStatus === 'approved' ? new Date().toISOString() : null,
      })
      .select('id, status, parsed_courses, risk_score, risk_level, verification_decision, created_at')
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
      await upsertParseQueue({
        verificationId: inserted.id,
        userId: user.id,
        verificationStatus: normalizeVerificationStatus(inserted.status),
        extractionConfidence: pipelineResult.parse.extractionConfidence,
        aiResultJson: sanitizedParsedTranscript,
        parserSource: String(sanitizedParserSource || ''),
        failureReason: manualFailureReason,
      });

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
        },
      });
    } catch (queueError) {
      console.error('Grade upload queue upsert error:', queueError);
    }

    if (requiresManualInput) {
      const manualReason =
        pipelineResult.parse.rawTextLength < 120
          ? 'We could not extract enough readable text from this PDF.'
          : lowQualityExtraction
            ? 'The PDF text layer appears unreadable/compressed for automatic parsing. Please export a text-searchable PDF and upload again, or submit grades manually below.'
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
            remainingUploadsToday: MAX_UPLOADS_PER_DAY - ((uploadsTodayCount || 0) + 1),
          },
        },
        { status: 200 }
      );
    }

    // Parsing succeeded: retain only structured data, delete raw transcript file for privacy.
    try {
      await deleteTranscriptFile(transcriptStorageBucket, transcriptStoragePath);
    } catch (storageDeleteError) {
      console.error('Transcript storage delete error:', storageDeleteError);
    }
    const { error: clearStorageRefError } = await adminClient
      .from('grade_verifications')
      .update({
        transcript_storage_bucket: null,
        transcript_storage_path: null,
        transcript_storage_uploaded_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inserted.id);
    if (clearStorageRefError) {
      console.error('Grade upload storage reference clear error:', clearStorageRefError);
    }

    return NextResponse.json(
      {
        data: {
          mode: 'parsed',
          verificationId: inserted.id,
          status: inserted.status,
          courses: inserted.parsed_courses || [],
          academicSummary: pipelineResult.parse.summary,
          parserSource: pipelineResult.parse.source,
          riskScore: inserted.risk_score,
          riskLevel: inserted.risk_level,
          decision: inserted.verification_decision,
          message:
            inserted.status === 'approved'
              ? 'Transcript parsed and auto-verified.'
              : 'Transcript parsed successfully. Your verification is now pending review.',
          remainingUploadsToday: MAX_UPLOADS_PER_DAY - ((uploadsTodayCount || 0) + 1),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Grade upload error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to upload transcript' } },
      { status: 500 }
    );
  }
}
