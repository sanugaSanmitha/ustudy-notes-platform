import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCoursesByCode, getPublishedListingsForCourse } from '@/lib/courses/catalog';

type PageProps = {
  params: { code: string };
};

export default async function CourseDetailPage({ params }: PageProps) {
  const result = await getCoursesByCode(decodeURIComponent(params.code));

  if (!result.ok || !result.primary) {
    notFound();
  }

  const listings = await getPublishedListingsForCourse(result.primary.courseCode);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/courses" className="text-sm text-blue-600 hover:underline">
        ← Back to course catalog
      </Link>

      <section className="mt-4 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-600">{result.primary.level}</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">{result.primary.courseCode}</h1>
            <p className="mt-2 max-w-3xl text-lg text-slate-600">{result.primary.courseTitle}</p>
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

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Available notes</h2>
          <span className="text-sm text-slate-400">
            {listings.length} note{listings.length === 1 ? '' : 's'}
          </span>
        </div>

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
          <div className="grid gap-4 md:grid-cols-2">
            {listings.map((listing) => (
              <Card key={listing.id} className="p-5">
                <h3 className="font-semibold text-slate-900">{listing.title}</h3>
                {listing.description && <p className="mt-2 text-sm text-slate-600 line-clamp-3">{listing.description}</p>}
                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div>
                    <dt className="font-medium text-slate-700">Semester</dt>
                    <dd>
                      {listing.semester} {listing.academic_year}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Language</dt>
                    <dd>{listing.language}</dd>
                  </div>
                  {listing.professor && (
                    <div className="col-span-2">
                      <dt className="font-medium text-slate-700">Professor</dt>
                      <dd>{listing.professor}</dd>
                    </div>
                  )}
                </dl>
                <p className="mt-4 text-lg font-semibold text-blue-700">HK${Number(listing.price_hkd).toFixed(0)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
