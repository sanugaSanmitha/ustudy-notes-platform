'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { PublishedCourseSummary } from '@/lib/notes/marketplace';

type CourseCodePillsProps = {
  courses: PublishedCourseSummary[];
};

export function CourseCodePills({ courses }: CourseCodePillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (courses.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;
    const amount = direction === 'left' ? -240 : 240;
    container.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">Browse by course</h2>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => scroll('left')}
          aria-label="Scroll courses left"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div
          ref={scrollRef}
          className="flex flex-1 gap-2 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {[...courses]
            .sort((a, b) => a.courseCode.localeCompare(b.courseCode))
            .map((course) => (
            <Link
              key={course.courseCode}
              href={`/courses/${course.courseCode}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
            >
              <span>{course.courseCode}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {course.sellerCount}
              </span>
            </Link>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => scroll('right')}
          aria-label="Scroll courses right"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}
