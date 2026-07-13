import Link from 'next/link';
import { CourseSearchBar } from '@/components/courses/course-search-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { searchCourses } from '@/lib/courses/catalog';

export const revalidate = 3600;

type CoursesPageProps = {
  searchParams: {
    q?: string;
    level?: string;
    page?: string;
  };
};

function buildCoursesQuery(
  current: CoursesPageProps['searchParams'],
  overrides: { level?: string; page?: number }
) {
  const params = new URLSearchParams();
  const q = (current.q || '').trim();
  const level = overrides.level ?? current.level ?? 'all';
  const page = overrides.page ?? Math.max(1, parseInt(current.page || '1', 10) || 1);

  if (q) {
    params.set('q', q);
  }
  if (level !== 'all') {
    params.set('level', level);
  }
  if (page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();
  return query ? `/courses?${query}` : '/courses';
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const q = (searchParams.q || '').trim();
  const levelParam = searchParams.level || 'all';
  const level = levelParam === 'UG' || levelParam === 'PG' ? levelParam : ('all' as const);
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const pageSize = 25;

  const result = await searchCourses({
    q,
    level,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const courses = result.ok ? result.courses : [];
  const total = result.ok ? result.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const error = result.ok ? '' : 'Course catalog is not ready. Run docs/migrations/019_courses_catalog.sql and npm run seed:courses.';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to home
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Browse University courses</h1>
        <p className="mt-2 text-slate-500">Search the official course catalog and find notes for each course.</p>
      </div>

      <div className="mb-6">
        <CourseSearchBar defaultQuery={q} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'UG', 'PG'] as const).map((option) => (
          <Button
            key={option}
            asChild
            size="sm"
            variant={level === option ? 'default' : 'outline'}
            className={level === option ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            <Link href={buildCoursesQuery(searchParams, { level: option, page: 1 })}>
              {option === 'all' ? 'All levels' : option}
            </Link>
          </Button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {total.toLocaleString()} course{total === 1 ? '' : 's'} found
        </p>
        {totalPages > 1 && (
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild size="sm" variant="outline">
                <Link href={buildCoursesQuery(searchParams, { page: page - 1 })}>Previous</Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                Previous
              </Button>
            )}
            {page < totalPages ? (
              <Button asChild size="sm" variant="outline">
                <Link href={buildCoursesQuery(searchParams, { page: page + 1 })}>Next</Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                Next
              </Button>
            )}
          </div>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {courses.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">No courses matched your search.</Card>
      ) : (
        <div className="space-y-2">
          {courses.map((course) => (
            <Link key={`${course.courseCode}-${course.courseTitle}`} href={`/courses/${course.courseCode}`}>
              <Card className="p-4 transition hover:border-blue-200 hover:bg-blue-50/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{course.courseCode}</p>
                    <p className="mt-1 text-sm text-slate-600">{course.courseTitle}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {course.level}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
