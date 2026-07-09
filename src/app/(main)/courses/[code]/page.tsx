import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Users } from 'lucide-react';
import { CourseListingsSection } from '@/components/marketplace/CourseListingsSection';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getGradeTier, getGradeTierGradient } from '@/lib/materials/grade-tiers';
import { getCoursesByCode } from '@/lib/courses/catalog';
import { formatGradeRange, formatRelativeTime } from '@/lib/notes/listing-utils';
import { getPublishedListingsForCourse } from '@/lib/notes/marketplace';

export const revalidate = 60;

type PageProps = {
  params: { code: string };
};

export default async function CourseDetailPage({ params }: PageProps) {
  const courseCode = decodeURIComponent(params.code);

  const [result, listings] = await Promise.all([
    getCoursesByCode(courseCode),
    getPublishedListingsForCourse(courseCode),
  ]);

  if (!result.ok || !result.primary) {
    notFound();
  }

  const sellerCount = new Set(listings.map((listing) => listing.user_id)).size;
  const gradeRangeLabel = formatGradeRange(listings.map((listing) => listing.grade));
  const latestListingAt = listings[0]?.created_at;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to home
      </Link>

      <section className="mt-4 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-600">{result.primary.level}</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">{result.primary.courseCode}</h1>
            <p className="mt-2 max-w-3xl text-lg text-slate-600">{result.primary.courseTitle}</p>

            {listings.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                  <Users className="size-4" />
                  {sellerCount} seller{sellerCount === 1 ? '' : 's'}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5">
                  {listings.length} material{listings.length === 1 ? '' : 's'}
                </span>
                {gradeRangeLabel && (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5">Grades {gradeRangeLabel}</span>
                )}
                {latestListingAt && (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5">
                    Newest {formatRelativeTime(latestListingAt)}
                  </span>
                )}
              </div>
            )}
          </div>
          <Button asChild variant="outline">
            <Link href="/register">Become a seller</Link>
          </Button>
        </div>

        {result.courses.length > 1 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Multiple catalog entries for this code</p>
            <ul className="mt-2 list-disc pl-5">
              {result.courses.map((course) => (
                <li key={course.courseTitle}>{course.courseTitle}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Grade tier legend</h2>
        <div className="flex flex-wrap gap-2">
          {(['A+', 'A', 'A-', 'B+', 'B', 'B-'] as const).map((grade) => {
            const tier = getGradeTier(grade);
            return (
              <span
                key={grade}
                className="rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm"
                style={{ background: getGradeTierGradient(grade) }}
              >
                {grade} · {tier.badge} {tier.label}
              </span>
            );
          })}
        </div>
      </section>

      {listings.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed px-6 py-16 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-blue-50 text-2xl">
            📚
          </div>
          <h3 className="text-lg font-medium text-slate-900">No notes yet for this course</h3>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Verified sellers can upload notes once they pass grade verification for {result.primary.courseCode}.
          </p>
        </Card>
      ) : (
        <CourseListingsSection listings={listings} courseCode={result.primary.courseCode} />
      )}
    </div>
  );
}
