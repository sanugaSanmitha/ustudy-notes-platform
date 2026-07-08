import { NextResponse } from 'next/server';
import { searchCourses } from '@/lib/courses/catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const levelParam = url.searchParams.get('level') || 'all';
    const dept = url.searchParams.get('dept') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20));
    const level = levelParam === 'UG' || levelParam === 'PG' ? levelParam : ('all' as const);

    const result = await searchCourses({
      q,
      level,
      dept,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: {
            code: result.error,
            message: 'Course catalog is not ready. Run docs/migrations/019_courses_catalog.sql and npm run seed:courses.',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        data: {
          courses: result.courses,
          pagination: {
            page,
            pageSize,
            total: result.total,
            totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Courses search error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to search courses.' } },
      { status: 500 }
    );
  }
}
