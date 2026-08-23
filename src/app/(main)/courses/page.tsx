import Link from 'next/link';
import { CourseLetterChips } from '@/components/courses/CourseLetterChips';
import { CourseSearchBar } from '@/components/courses/course-search-bar';
import { Card } from '@/components/ui/card';
import { getCourseLetterCounts, searchCourses } from '@/lib/courses/catalog';
import { getServerT } from '@/lib/i18n/server-translate';
import { cn } from '@/lib/utils';

export const revalidate = 3600;

type CoursesPageProps = {
  searchParams: {
    q?: string;
    level?: string;
    letter?: string;
    page?: string;
  };
};

function buildCoursesQuery(
  current: CoursesPageProps['searchParams'],
  overrides: { level?: string; page?: number; letter?: string | null }
) {
  const params = new URLSearchParams();
  const q = (current.q || '').trim();
  const level = overrides.level ?? current.level ?? 'all';
  const page = overrides.page ?? Math.max(1, parseInt(current.page || '1', 10) || 1);
  const letter =
    overrides.letter === undefined ? (current.letter || '').trim().toUpperCase() : (overrides.letter || '');

  if (q) {
    params.set('q', q);
  }
  if (level !== 'all') {
    params.set('level', level);
  }
  if (/^[A-Z]$/.test(letter)) {
    params.set('letter', letter);
  }
  if (page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();
  return query ? `/courses?${query}` : '/courses';
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const t = await getServerT();
  const q = (searchParams.q || '').trim();
  const levelParam = searchParams.level || 'all';
  const level = levelParam === 'UG' || levelParam === 'PG' ? levelParam : ('all' as const);
  const letterParam = (searchParams.letter || '').trim().toUpperCase();
  const letter = /^[A-Z]$/.test(letterParam) ? letterParam : '';
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const pageSize = 25;

  const [result, letterCounts] = await Promise.all([
    searchCourses({
      q,
      level,
      dept: letter,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    getCourseLetterCounts(level),
  ]);

  const courses = result.ok ? result.courses : [];
  const total = result.ok ? result.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const error = result.ok
    ? ''
    : t('coursesCatalogNotReady');

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-16">
        <section className="mb-2 flex flex-col items-center gap-4">
          <h1 className="text-center text-[32px] font-bold leading-10 tracking-[-0.32px] text-[#2c5599]">
            {t('coursesFindTitle')}
          </h1>
          <CourseSearchBar
            variant="catalog"
            defaultQuery={q}
            extraParams={{
              ...(level !== 'all' ? { level } : {}),
              ...(letter ? { letter } : {}),
            }}
          />
        </section>

        <CourseLetterChips
          letters={letterCounts.map((item) => ({
            ...item,
            href: buildCoursesQuery(searchParams, {
              letter: letter === item.letter ? null : item.letter,
              page: 1,
            }),
          }))}
          activeLetter={letter || undefined}
        />

        <div className="mb-4 flex flex-wrap items-center justify-center gap-4 pt-2">
          {(['all', 'UG', 'PG'] as const).map((option) => (
            <Link
              key={option}
              href={buildCoursesQuery(searchParams, { level: option, page: 1 })}
              prefetch={false}
              className={cn(
                'inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-[13px] font-medium tracking-[0.14px]',
                level === option
                  ? 'border-[#004ac6] bg-[#004ac6] text-white'
                  : 'border-[#c3c6d7] bg-white text-[#131b2e] hover:border-[#004ac6]'
              )}
            >
              {option === 'all' ? t('coursesAllLevels') : option}
            </Link>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-between border-b border-[#c3c6d7] pb-4">
          <p className="text-[16px] leading-6 text-[#434655]">
            <span className="font-bold text-[#131b2e]">{total.toLocaleString()}</span>
            {` ${total === 1 ? t('coursesCourseFound') : t('coursesCoursesFound')}`}
          </p>
          {total > 0 ? (
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={buildCoursesQuery(searchParams, { page: page - 1 })}
                  aria-label={t('coursesPrevPage')}
                  className="flex items-center justify-center rounded px-2 py-2 hover:bg-[#f2f3ff]"
                >
                  <span className="relative h-3 w-[7.4px] overflow-clip">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/page-prev.svg" alt="" width={8} height={12} className="size-full" />
                  </span>
                </Link>
              ) : (
                <span className="flex items-center justify-center px-2 py-2 opacity-30">
                  <span className="relative h-3 w-[7.4px] overflow-clip">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/page-prev.svg" alt="" width={8} height={12} className="size-full" />
                  </span>
                </span>
              )}
              <span className="text-[14px] font-medium tracking-[0.14px] text-[#131b2e]">
                {t('coursesPageOf').replace('{page}', String(page)).replace('{totalPages}', String(totalPages))}
              </span>
              {page < totalPages ? (
                <Link
                  href={buildCoursesQuery(searchParams, { page: page + 1 })}
                  aria-label={t('coursesNextPage')}
                  className="flex items-center justify-center rounded px-2 py-2 hover:bg-[#f2f3ff]"
                >
                  <span className="relative h-3 w-[7.4px] overflow-clip">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/page-next.svg" alt="" width={8} height={12} className="size-full" />
                  </span>
                </Link>
              ) : (
                <span className="flex items-center justify-center px-2 py-2 opacity-30">
                  <span className="relative h-3 w-[7.4px] overflow-clip">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/page-next.svg" alt="" width={8} height={12} className="size-full" />
                  </span>
                </span>
              )}
            </div>
          ) : null}
        </div>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        {courses.length === 0 ? (
          <Card className="rounded-xl border-[#c3c6d7] p-8 text-center text-sm text-[#434655]">
            {t('coursesNoMatch')}
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {courses.map((course) => (
              <Link
                key={`${course.courseCode}-${course.courseTitle}`}
                href={`/courses/${course.courseCode}`}
                prefetch={false}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-[#c3c6d7] bg-white px-4 py-3 transition hover:border-[#004ac6] hover:shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-[92px] shrink-0 items-center justify-center rounded border border-[#c3c6d7] bg-[#f2f3ff] px-2">
                    <span className="text-center text-[13px] font-bold leading-none text-[#004ac6]">
                      {course.courseCode}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-bold leading-5 text-[#131b2e]">{course.courseTitle}</h2>
                    <p className="mt-0.5 truncate text-[12px] leading-4 text-[#434655]">
                      {course.level === 'UG' ? t('coursesUndergraduate') : t('coursesPostgraduate')}{' '}
                      {t('coursesInCatalog')}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-white">
                    {course.level}
                  </span>
                  <span className="relative size-3.5 overflow-clip">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/course-row-arrow.svg" alt="" width={14} height={14} className="size-full" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
