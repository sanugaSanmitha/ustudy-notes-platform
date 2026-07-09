import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { deleteTranscriptFile, uploadTranscriptFile } from '@/lib/grades/transcript-storage';
import { getGradeTier } from '@/lib/materials/grade-tiers';
import { formatMaterialReuploadWindowLabel } from '@/lib/materials/config';
import { isMaterialLocked, REUPLOAD_WINDOW_MS } from '@/lib/materials/lock';
import { extractZipFileNames } from '@/lib/materials/zip-preview';

const MAX_ZIP_BYTES = 100 * 1024 * 1024;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('is_seller')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Materials upload profile error:', profileError);
      return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to verify seller status.' } }, { status: 500 });
    }

    if (!profile?.is_seller) {
      return NextResponse.json(
        { error: { code: 'SELLER_REQUIRED', message: 'Complete grade verification before uploading materials.' } },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const verificationId = String(formData.get('verificationId') || '').trim();
    const courseCodeRaw = String(formData.get('courseCode') || '').trim();
    const file = formData.get('file');

    if (!verificationId || !courseCodeRaw || !(file instanceof File)) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Missing required fields.' } }, { status: 400 });
    }

    const courseCode = courseCodeRaw.toUpperCase().replace(/\s+/g, '');

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: { code: 'INVALID_FILE_TYPE', message: 'Only ZIP files are allowed.' } }, { status: 400 });
    }

    if (file.size > MAX_ZIP_BYTES) {
      return NextResponse.json({ error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 100MB limit.' } }, { status: 400 });
    }

    const { data: verification, error: verificationError } = await adminClient
      .from('grade_verifications')
      .select('id, status')
      .eq('id', verificationId)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .maybeSingle();

    if (verificationError) {
      console.error('Materials upload verification error:', verificationError);
      return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to validate verification.' } }, { status: 500 });
    }

    if (!verification) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Verification not found or not approved.' } },
        { status: 404 }
      );
    }

    const { data: verifiedCourse, error: verifiedCourseError } = await adminClient
      .from('verified_courses')
      .select('course_code, course_name, grade')
      .eq('user_id', user.id)
      .eq('verification_id', verificationId)
      .eq('course_code', courseCode)
      .maybeSingle();

    if (verifiedCourseError) {
      console.error('Materials upload verified course error:', verifiedCourseError);
      return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to validate verified course.' } }, { status: 500 });
    }

    if (!verifiedCourse) {
      return NextResponse.json(
        { error: { code: 'COURSE_NOT_VERIFIED', message: `Course ${courseCode} is not verified for this submission.` } },
        { status: 403 }
      );
    }

    const { data: existingMaterial, error: existingError } = await adminClient
      .from('course_materials')
      .select('*')
      .eq('verification_id', verificationId)
      .eq('course_code', courseCode)
      .maybeSingle();

    if (existingError) {
      console.error('Materials upload existing error:', existingError);
      return NextResponse.json(
        {
          error: {
            code: 'FETCH_ERROR',
            message: 'Failed to check existing material. Run docs/migrations/022_course_materials.sql in Supabase SQL Editor.',
          },
        },
        { status: 500 }
      );
    }

    if (existingMaterial && isMaterialLocked(existingMaterial.uploaded_at, existingMaterial.is_locked)) {
      const windowLabel = formatMaterialReuploadWindowLabel();
      return NextResponse.json(
        {
          error: {
            code: 'LOCKED',
            message: `${windowLabel} window expired. Course is locked.`,
          },
          data: {
            isLocked: true,
            lockedAt: existingMaterial.locked_at || existingMaterial.uploaded_at,
          },
        },
        { status: 403 }
      );
    }

    const zipBuffer = Buffer.from(await file.arrayBuffer());
    let zipFileNames: string[] = [];
    try {
      zipFileNames = await extractZipFileNames(zipBuffer);
    } catch (zipError) {
      console.error('Materials ZIP preview error:', zipError);
      return NextResponse.json({ error: { code: 'INVALID_FILE', message: 'Could not read ZIP contents. Upload a valid ZIP archive.' } }, { status: 400 });
    }

    const storagePath = `course-materials/${user.id}/${verificationId}/${courseCode}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    let zipStorageBucket: string | null = null;
    try {
      const storage = await uploadTranscriptFile(zipBuffer, storagePath, 'application/zip');
      zipStorageBucket = storage.bucket;
    } catch (storageError) {
      console.error('Materials upload storage error:', storageError);
      await adminClient.from('material_upload_attempts').insert({
        user_id: user.id,
        verification_id: verificationId,
        course_code: courseCode,
        attempt_number: existingMaterial ? (existingMaterial.version || 0) + 1 : 1,
        success: false,
        error_message: 'Failed to upload file to storage.',
      });
      return NextResponse.json({ error: { code: 'STORAGE_ERROR', message: 'Failed to upload file.' } }, { status: 500 });
    }

    if (existingMaterial?.zip_storage_bucket && existingMaterial?.zip_storage_path) {
      try {
        await deleteTranscriptFile(existingMaterial.zip_storage_bucket, existingMaterial.zip_storage_path);
      } catch (deleteError) {
        console.error('Materials old file delete error:', deleteError);
      }
    }

    const nowIso = new Date().toISOString();
    const nextVersion = existingMaterial ? (existingMaterial.version || 0) + 1 : 1;

    const { data: material, error: upsertError } = await adminClient
      .from('course_materials')
      .upsert(
        {
          user_id: user.id,
          verification_id: verificationId,
          course_code: courseCode,
          course_name: verifiedCourse.course_name || courseCode,
          grade: verifiedCourse.grade,
          zip_filename: file.name,
          zip_size_bytes: file.size,
          zip_storage_bucket: zipStorageBucket,
          zip_storage_path: storagePath,
          zip_file_names: zipFileNames,
          uploaded_at: nowIso,
          is_locked: false,
          locked_at: null,
          version: nextVersion,
          updated_at: nowIso,
        },
        { onConflict: 'verification_id,course_code' }
      )
      .select('*')
      .single();

    if (upsertError || !material) {
      console.error('Materials upload upsert error:', upsertError);
      await deleteTranscriptFile(zipStorageBucket, storagePath);
      return NextResponse.json(
        {
          error: {
            code: 'SAVE_ERROR',
            message: 'Failed to save material record. Run docs/migrations/022_course_materials.sql in Supabase SQL Editor.',
          },
        },
        { status: 500 }
      );
    }

    await adminClient.from('material_upload_attempts').insert({
      user_id: user.id,
      verification_id: verificationId,
      course_code: courseCode,
      attempt_number: nextVersion,
      success: true,
      zip_storage_bucket: zipStorageBucket,
      zip_storage_path: storagePath,
    });

    const windowLabel = formatMaterialReuploadWindowLabel();

    return NextResponse.json(
      {
        data: {
          material,
          gradeTier: getGradeTier(verifiedCourse.grade),
          canReupload: true,
          timeRemaining: Math.floor(REUPLOAD_WINDOW_MS / 1000),
          zipFileNames,
          message: existingMaterial
            ? `Material updated successfully. You can re-upload within ${windowLabel}.`
            : `Material uploaded successfully. You have ${windowLabel} to re-upload if needed.`,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Materials upload error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to upload material.' } }, { status: 500 });
  }
}
