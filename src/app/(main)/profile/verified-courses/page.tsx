'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type VerifiedCourse = {
  id: string;
  course_code: string;
  course_name: string | null;
  grade: string;
  academic_year: string | null;
  semester: string | null;
  verified_at: string;
};

export default function VerifiedCoursesPage() {
  const [courses, setCourses] = useState<VerifiedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/verified-courses', { cache: 'no-store', credentials: 'same-origin' });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setError(result?.error?.message || 'Failed to load verified courses.');
          return;
        }
        setCourses(result?.data?.courses || []);
      } catch {
        setError('Unable to load verified courses right now.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Verified Courses</h1>
      <p className="mt-2 text-slate-600">Courses unlocked from your approved transcript verification.</p>

      {loading ? (
        <p className="mt-6 text-slate-600">Loading...</p>
      ) : error ? (
        <Card className="mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>
      ) : courses.length === 0 ? (
        <Card className="mt-6 p-6 text-sm text-slate-700">
          No verified courses yet. Complete grade verification to unlock courses for note uploads.
          <div className="mt-4">
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/grades/upload">Verify Seller</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {courses.map((course) => (
            <Card key={course.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">✓ {course.course_code}</p>
                  <p className="text-sm text-slate-600">{course.course_name || 'Course title unavailable'}</p>
                  <p className="text-sm text-slate-600">
                    Grade: {course.grade}
                    {course.semester ? ` · ${course.semester}` : ''}
                    {course.academic_year ? ` ${course.academic_year}` : ''}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/notes/upload?course=${encodeURIComponent(course.course_code)}`}>Upload Notes</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
