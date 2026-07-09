import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { listAdminMaterials } from '@/lib/materials/admin-materials';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10) || 25));
  const lockedParam = url.searchParams.get('locked') || 'all';
  const locked = lockedParam === 'locked' || lockedParam === 'unlocked' ? lockedParam : 'all';

  const result = await listAdminMaterials({
    search: url.searchParams.get('search') || '',
    locked,
    page,
    pageSize,
  });

  if (!result.ok) {
    console.error('Admin materials list error:', result.error);
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to load materials. Run docs/migrations/022_course_materials.sql and 023_material_downloads_and_preview.sql.',
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: {
        materials: result.materials,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    },
    { status: 200 }
  );
}
