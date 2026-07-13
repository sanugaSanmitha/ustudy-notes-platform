import { NextResponse } from 'next/server';
import { getCoursesByCode, getPublishedListingsForCourse } from '@/lib/courses/catalog';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: { code: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const result = await getCoursesByCode(decodeURIComponent(context.params.code));

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

    if (!result.primary) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Course ${context.params.code} was not found in the University catalog.` } },
        { status: 404 }
      );
    }

    const listings = await getPublishedListingsForCourse(result.primary.courseCode);

    return NextResponse.json(
      {
        data: {
          course: result.primary,
          variants: result.courses,
          listings,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Course detail error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load course.' } },
      { status: 500 }
    );
  }
}
