'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CourseSearchBar } from '@/components/courses/course-search-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CatalogCourse = {
  courseCode: string;
  courseTitle: string;
  level: 'UG' | 'PG';
};

export default function CoursesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') || '';
  const level = searchParams.get('level') || 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (level !== 'all') params.set('level', level);
        params.set('page', String(page));
        params.set('pageSize', '25');

        const response = await fetch(`/api/courses?${params.toString()}`, { cache: 'no-store' });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setError(result?.error?.message || 'Failed to load courses.');
          setCourses([]);
          return;
        }
        setCourses(result?.data?.courses || []);
        setTotal(result?.data?.pagination?.total || 0);
        setTotalPages(result?.data?.pagination?.totalPages || 1);
      } catch {
        setError('Unable to load courses.');
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [q, level, page]);

  const setLevel = (nextLevel: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextLevel === 'all') {
      params.delete('level');
    } else {
      params.set('level', nextLevel);
    }
    params.delete('page');
    router.push(`/courses?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to home
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Browse HKUST courses</h1>
        <p className="mt-2 text-slate-500">Search the official course catalog and find notes for each course.</p>
      </div>

      <div className="mb-6">
        <CourseSearchBar />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'UG', 'PG'] as const).map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={level === option ? 'default' : 'outline'}
            className={level === option ? 'bg-blue-600 hover:bg-blue-700' : ''}
            onClick={() => setLevel(option)}
          >
            {option === 'all' ? 'All levels' : option}
          </Button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {loading ? 'Loading…' : `${total.toLocaleString()} course${total === 1 ? '' : 's'} found`}
        </p>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('page', String(page - 1));
                router.push(`/courses?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('page', String(page + 1));
                router.push(`/courses?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <Card className="p-8 text-center text-sm text-slate-500">Loading courses…</Card>
      ) : courses.length === 0 ? (
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
