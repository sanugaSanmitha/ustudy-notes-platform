import Link from 'next/link';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { PublishedCourseSummary } from '@/lib/notes/marketplace';
import { formatRelativeTime } from '@/lib/notes/listing-utils';

type FeaturedCoursesCarouselProps = {
  courses: PublishedCourseSummary[];
};

function FeaturedCourseCard({ course }: { course: PublishedCourseSummary }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-4 py-3 text-white">
        <p className="text-[11px] font-medium uppercase tracking-wide text-blue-100">
          {formatRelativeTime(course.latestListingAt)}
        </p>
        <h3 className="mt-1 text-xl font-bold tracking-tight">{course.courseCode}</h3>
        {course.courseTitle && (
          <p className="mt-0.5 line-clamp-1 text-sm text-blue-100">{course.courseTitle}</p>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
            <Users className="size-3" />
            {course.sellerCount} seller{course.sellerCount === 1 ? '' : 's'}
          </span>
          {course.gradeRangeLabel && (
            <span className="rounded-full bg-slate-100 px-2 py-1">Grades {course.gradeRangeLabel}</span>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {course.listingCount} published material{course.listingCount === 1 ? '' : 's'}
        </p>

        <Button asChild size="sm" className="mt-auto w-fit bg-blue-600 hover:bg-blue-700">
          <Link href={`/courses/${course.courseCode}`}>View materials →</Link>
        </Button>
      </div>
    </Card>
  );
}

export function FeaturedCoursesCarousel({ courses }: FeaturedCoursesCarouselProps) {
  if (courses.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Featured latest uploads</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <FeaturedCourseCard key={course.courseCode} course={course} />
        ))}
      </div>
    </section>
  );
}
