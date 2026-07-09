import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { recordMaterialDownload } from '@/lib/materials/admin-materials';
import { isMaterialLocked } from '@/lib/materials/lock';
import { createTranscriptSignedUrl } from '@/lib/grades/transcript-storage';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { materialId: string } };

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    const { data: material, error: materialError } = await adminClient
      .from('course_materials')
      .select('*')
      .eq('id', params.materialId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (materialError) {
      console.error('Material download fetch error:', materialError);
      return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to load material.' } }, { status: 500 });
    }

    if (!material) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Material not found.' } }, { status: 404 });
    }

    const locked = isMaterialLocked(material.uploaded_at, material.is_locked);
    if (!locked) {
      return NextResponse.json(
        { error: { code: 'NOT_LOCKED', message: 'Download is available after the re-upload window closes.' } },
        { status: 403 }
      );
    }

    if (!material.zip_storage_bucket || !material.zip_storage_path) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Material file unavailable.' } }, { status: 404 });
    }

    const downloadResult = await recordMaterialDownload(material.id, user.id, 'student');
    if (!downloadResult.ok) {
      console.error('Material download tracking error:', downloadResult.error);
      return NextResponse.json({ error: { code: 'TRACK_ERROR', message: 'Failed to record download.' } }, { status: 500 });
    }

    const downloadUrl = await createTranscriptSignedUrl(material.zip_storage_bucket, material.zip_storage_path);
    if (!downloadUrl) {
      return NextResponse.json({ error: { code: 'STORAGE_ERROR', message: 'Failed to create download link.' } }, { status: 500 });
    }

    return NextResponse.json(
      {
        data: {
          downloadUrl,
          downloadCount: downloadResult.downloadCount,
          zipFileNames: Array.isArray(material.zip_file_names) ? material.zip_file_names : [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Material download error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to download material.' } }, { status: 500 });
  }
}
