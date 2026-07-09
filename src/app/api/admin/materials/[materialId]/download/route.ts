import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { adminClient } from '@/lib/supabase/admin';
import { recordMaterialDownload } from '@/lib/materials/admin-materials';
import { createTranscriptSignedUrl } from '@/lib/grades/transcript-storage';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { materialId: string } };

export async function POST(_request: Request, { params }: RouteContext) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  try {
    const { data: material, error: materialError } = await adminClient
      .from('course_materials')
      .select('*')
      .eq('id', params.materialId)
      .maybeSingle();

    if (materialError || !material) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Material not found.' } }, { status: 404 });
    }

    if (!material.zip_storage_bucket || !material.zip_storage_path) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Material file unavailable.' } }, { status: 404 });
    }

    const downloadResult = await recordMaterialDownload(material.id, auth.user.id, 'admin');
    if (!downloadResult.ok) {
      console.error('Admin material download tracking error:', downloadResult.error);
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
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin material download error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to download material.' } }, { status: 500 });
  }
}
