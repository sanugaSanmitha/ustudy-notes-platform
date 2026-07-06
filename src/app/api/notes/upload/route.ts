import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { uploadTranscriptFile } from '@/lib/grades/transcript-storage';

const MAX_ZIP_BYTES = 500 * 1024 * 1024;

const metadataSchema = z.object({
  courseCode: z.string().trim().min(4).max(16),
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

    if (!(zip instanceof File)) {
      return NextResponse.json({ error: { code: 'INVALID_FILE', message: 'Please upload a ZIP file.' } }, { status: 400 });
    }

    if (!zip.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: { code: 'INVALID_FILE_TYPE', message: 'Only ZIP files are supported.' } }, { status: 400 });
    }

    if (zip.size > MAX_ZIP_BYTES) {
      return NextResponse.json({ error: { code: 'FILE_TOO_LARGE', message: 'ZIP file must be 500MB or smaller.' } }, { status: 400 });
    }

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

    const listingId = randomUUID();
    const zipBuffer = Buffer.from(await zip.arrayBuffer());
    const storagePath = `notes/${user.id}/${listingId}/${Date.now()}-${zip.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    let zipStorageBucket: string | null = null;
    try {
      const storage = await uploadTranscriptFile(zipBuffer, storagePath, 'application/zip');
      zipStorageBucket = storage.bucket;
    } catch (storageError) {
      console.error('Notes ZIP storage error:', storageError);
      return NextResponse.json({ error: { code: 'STORAGE_ERROR', message: 'Failed to store note ZIP file.' } }, { status: 500 });
    }

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
        zip_filename: zip.name,
        zip_size_bytes: zip.size,
        zip_storage_bucket: zipStorageBucket,
        zip_storage_path: storagePath,
        file_names: parsedMetadata.data.fileNames,
        file_count: parsedMetadata.data.fileNames.length,
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
