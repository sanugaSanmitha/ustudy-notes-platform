import Link from 'next/link';
import { CourseSearchBar } from '@/components/courses/course-search-bar';
import { CourseCodePills } from '@/components/marketplace/CourseCodePills';
import { FeaturedCoursesCarousel } from '@/components/marketplace/FeaturedCoursesCarousel';
import { NoteListingCard } from '@/components/notes/NoteListingCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getHomepageMarketplaceData } from '@/lib/notes/marketplace';

export async function MarketplaceSection() {
  const { publishedNotesCount, featuredCourses, courseSummaries, latestListings } =
    await getHomepageMarketplaceData();

  if (publishedNotesCount === 0) {
    return (
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Course notes</h2>
          <Link href="/courses" className="text-sm text-blue-600 hover:underline">
            Browse all courses
          </Link>
        </div>

        <div className="mb-8">
          <CourseSearchBar />
        </div>

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
      </section>
    );
  }

  return (
    <>
      <FeaturedCoursesCarousel courses={featuredCourses} />

      <section className="mb-10">
        <CourseSearchBar />
      </section>

      <CourseCodePills courses={courseSummaries} />

      {latestListings.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Recently published notes</h2>
            <Link href="/courses" className="text-sm text-blue-600 hover:underline">
              Browse all courses
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {latestListings.map((listing) => (
              <NoteListingCard key={listing.id} listing={listing} showCourseCode />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
