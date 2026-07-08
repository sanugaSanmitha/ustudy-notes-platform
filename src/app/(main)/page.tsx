import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CourseSearchBar } from '@/components/courses/course-search-bar';
import { countPublishedNotes } from '@/lib/courses/catalog';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const publishedNotesCount = await countPublishedNotes();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Find course notes from HKUST students
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-500">
          Browse verified notes by course, semester, and grade. Buy securely and download instantly.
        </p>

        {!user && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/register">Get started</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="mb-8">
        <CourseSearchBar />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Course notes</h2>
          <Link href="/courses" className="text-sm text-blue-600 hover:underline">
            Browse all courses
          </Link>
        </div>

        {publishedNotesCount > 0 ? (
          <Card className="p-6">
            <p className="text-sm text-slate-600">
              {publishedNotesCount} published note{publishedNotesCount === 1 ? '' : 's'} available. Search above or
              browse the full catalog.
            </p>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center border-dashed px-6 py-16 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-blue-50 text-2xl">
              📚
            </div>
            <h3 className="text-lg font-medium text-slate-900">No notes yet</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Published notes will show up here once sellers upload and admins approve them. You can already browse all
              HKUST courses using search.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/register">Become a seller</Link>
            </Button>
          </Card>
        )}
      </section>
    </div>
  );
}
