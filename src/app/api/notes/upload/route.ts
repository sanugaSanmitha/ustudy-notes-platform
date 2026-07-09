import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { uploadTranscriptFile } from '@/lib/grades/transcript-storage';
import { isMaterialLocked } from '@/lib/materials/lock';
import { formatMaterialReuploadWindowLabel } from '@/lib/materials/config';

const MAX_ZIP_BYTES = 500 * 1024 * 1024;

const metadataSchema = z.object({
  courseCode: z.string().trim().min(4).max(16),
  materialId: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional(),
  professor: z.string().trim().max(120).optional(),
  academicYear: z.string().trim().min(4).max(20),
  semester: z.enum(['Fall', 'Winter', 'Spring', 'Summer']),
  language: z.string().trim().min(2).max(40).default('English'),
  priceHkd: z.coerce.number().min(0).max(99999),
  fileNames: z.array(z.string().trim().min(1).max(255)).min(1).max(200),
});

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
      console.error('Notes upload profile error:', profileError);
      return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to verify seller status.' } }, { status: 500 });
    }

    if (!profile?.is_seller) {
      return NextResponse.json(
        { error: { code: 'SELLER_REQUIRED', message: 'Complete grade verification before uploading notes.' } },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const zip = formData.get('zip');
    const metadataRaw = formData.get('metadata');

    let metadataJson: unknown = null;
    try {
      metadataJson = JSON.parse(String(metadataRaw || '{}'));
    } catch {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid note metadata.' } }, { status: 400 });
    }

    const parsedMetadata = metadataSchema.safeParse(metadataJson);
    if (!parsedMetadata.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: parsedMetadata.error.issues[0]?.message || 'Invalid note metadata.' } },
        { status: 400 }
      );
    }

    const courseCode = parsedMetadata.data.courseCode.toUpperCase().replace(/\s+/g, '');
    const { data: verifiedCourse, error: verifiedError } = await adminClient
      .from('verified_courses')
      .select('id, course_code')
      .eq('user_id', user.id)
      .eq('course_code', courseCode)
      .maybeSingle();

    if (verifiedError) {
      console.error('Notes upload verified course error:', verifiedError);
      return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to validate verified course.' } }, { status: 500 });
    }

    if (!verifiedCourse) {
      return NextResponse.json(
        { error: { code: 'COURSE_NOT_VERIFIED', message: `You can only upload notes for verified course ${courseCode}.` } },
        { status: 403 }
      );
    }

    let zipFilename: string;
    let zipSizeBytes: number;
    let zipStorageBucket: string | null;
    let zipStoragePath: string;
    let fileNames = parsedMetadata.data.fileNames;

    if (parsedMetadata.data.materialId) {
      const { data: material, error: materialError } = await adminClient
        .from('course_materials')
        .select('*')
        .eq('id', parsedMetadata.data.materialId)
        .eq('user_id', user.id)
        .eq('course_code', courseCode)
        .maybeSingle();

      if (materialError) {
        console.error('Notes upload material error:', materialError);
        return NextResponse.json(
          {
            error: {
              code: 'FETCH_ERROR',
              message: 'Failed to load course material. Run docs/migrations/022_course_materials.sql in Supabase SQL Editor.',
            },
          },
          { status: 500 }
        );
      }

      if (!material) {
        return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Course material not found.' } }, { status: 404 });
      }

      if (!isMaterialLocked(material.uploaded_at, material.is_locked)) {
        const windowLabel = formatMaterialReuploadWindowLabel();
        return NextResponse.json(
          {
            error: {
              code: 'MATERIAL_NOT_LOCKED',
              message: `Wait for the ${windowLabel} upload window to close before publishing.`,
            },
          },
          { status: 403 }
        );
      }

      if (!material.zip_storage_bucket || !material.zip_storage_path) {
        return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Course material file unavailable.' } }, { status: 404 });
      }

      zipFilename = material.zip_filename;
      zipSizeBytes = material.zip_size_bytes;
      zipStorageBucket = material.zip_storage_bucket;
      zipStoragePath = material.zip_storage_path;
      fileNames = Array.isArray(material.zip_file_names) && material.zip_file_names.length > 0
        ? material.zip_file_names
        : parsedMetadata.data.fileNames;
    } else if (zip instanceof File) {
      if (!zip.name.toLowerCase().endsWith('.zip')) {
        return NextResponse.json({ error: { code: 'INVALID_FILE_TYPE', message: 'Only ZIP files are supported.' } }, { status: 400 });
      }

      if (zip.size > MAX_ZIP_BYTES) {
        return NextResponse.json({ error: { code: 'FILE_TOO_LARGE', message: 'ZIP file must be 500MB or smaller.' } }, { status: 400 });
      }

      const listingId = randomUUID();
      const zipBuffer = Buffer.from(await zip.arrayBuffer());
      zipStoragePath = `notes/${user.id}/${listingId}/${Date.now()}-${zip.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      try {
        const storage = await uploadTranscriptFile(zipBuffer, zipStoragePath, 'application/zip');
        zipStorageBucket = storage.bucket;
      } catch (storageError) {
        console.error('Notes ZIP storage error:', storageError);
        return NextResponse.json({ error: { code: 'STORAGE_ERROR', message: 'Failed to store note ZIP file.' } }, { status: 500 });
      }

      zipFilename = zip.name;
      zipSizeBytes = zip.size;
    } else {
      return NextResponse.json(
        {
          error: {
            code: 'MATERIAL_REQUIRED',
            message: 'Upload and lock course material on the Notes Upload page before publishing.',
          },
        },
        { status: 400 }
      );
    }

    const listingId = randomUUID();

    const { data: inserted, error: insertError } = await adminClient
      .from('note_listings')
      .insert({
        id: listingId,
        user_id: user.id,
        course_code: courseCode,
        title: parsedMetadata.data.title,
        description: parsedMetadata.data.description || null,
        professor: parsedMetadata.data.professor || null,
        academic_year: parsedMetadata.data.academicYear,
        semester: parsedMetadata.data.semester,
        language: parsedMetadata.data.language,
        price_hkd: parsedMetadata.data.priceHkd,
        zip_filename: zipFilename,
        zip_size_bytes: zipSizeBytes,
        zip_storage_bucket: zipStorageBucket,
        zip_storage_path: zipStoragePath,
        file_names: fileNames,
        file_count: fileNames.length,
        status: 'pending_review',
      })
      .select('id, status, course_code, title')
      .single();

    if (insertError || !inserted) {
      console.error('Note listing insert error:', insertError);
      return NextResponse.json(
        {
          error: {
            code: 'SAVE_ERROR',
            message: 'Failed to save note listing. Run docs/migrations/016_note_listings.sql in Supabase SQL Editor.',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: {
          listingId: inserted.id,
          status: inserted.status,
          courseCode: inserted.course_code,
          title: inserted.title,
          message: 'Notes submitted successfully and are pending moderation.',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Notes upload error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to upload notes.' } }, { status: 500 });
  }
}
