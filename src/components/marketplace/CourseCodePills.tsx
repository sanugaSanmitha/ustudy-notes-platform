'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import type { BrowseCoursePill } from '@/lib/courses/catalog';

type CourseCodePillsProps = {
  courses: BrowseCoursePill[];
  variant?: 'default' | 'homepage';
};

export function CourseCodePills({ courses, variant = 'default' }: CourseCodePillsProps) {
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

  const isHomepage = variant === 'homepage';

  return (
    <section className="mb-10">
      {isHomepage ? null : <h2 className="mb-4 text-xl font-semibold text-slate-900">Browse by course</h2>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={
            isHomepage
              ? 'flex size-[30px] shrink-0 items-center justify-center text-[#1f2f66]'
              : 'flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white'
          }
          onClick={() => scroll('left')}
          aria-label="Scroll courses left"
        >
          <ChevronLeft className={isHomepage ? 'size-7' : 'size-4'} />
        </button>

        <div
          ref={scrollRef}
          className="flex flex-1 gap-[14px] overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {courses.map((course) => (
            <Link
              key={course.courseCode}
              href={`/courses/${course.courseCode}`}
              prefetch={false}
              className={
                isHomepage
                  ? 'inline-flex h-[34px] shrink-0 items-center gap-2 rounded-[25px] bg-[#f3f3f3] py-1 pl-2.5 pr-2 text-[12px] font-normal leading-none text-black'
                  : 'inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50'
              }
            >
              <span>{course.courseCode}</span>
              <span
                className={
                  isHomepage
                    ? 'inline-flex size-5 items-center justify-center rounded-full bg-[#e6e6e6] text-[10px] font-normal leading-none text-black'
                    : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500'
                }
              >
                {course.listingCount}
              </span>
            </Link>
          ))}
        </div>

        <button
          type="button"
          className={
            isHomepage
              ? 'flex size-[30px] shrink-0 items-center justify-center text-[#1f2f66]'
              : 'flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white'
          }
          onClick={() => scroll('right')}
          aria-label="Scroll courses right"
        >
          <ChevronRight className={isHomepage ? 'size-7' : 'size-4'} />
        </button>
      </div>
    </section>
  );
}
