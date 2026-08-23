import { CourseSearchBar } from '@/components/courses/course-search-bar';
import { CourseCodePills } from '@/components/marketplace/CourseCodePills';
import { EmptyMarketplaceCard } from '@/components/marketplace/EmptyMarketplaceCard';
import { FeaturedListingsCarousel } from '@/components/marketplace/FeaturedListingsCarousel';
import { LearnGrowAchieve } from '@/components/marketplace/LearnGrowAchieve';
import { PublishNotesSection } from '@/components/marketplace/PublishNotesSection';
import { getBrowseCoursePills } from '@/lib/courses/catalog';
import { getHomepageMarketplaceData } from '@/lib/notes/marketplace';

export async function MarketplaceSection() {
  const [{ publishedNotesCount, latestListings, publishListings }, coursePills] = await Promise.all([
    getHomepageMarketplaceData(),
    getBrowseCoursePills(),
  ]);

  return (
    <>
      {publishedNotesCount > 0 ? <FeaturedListingsCarousel listings={latestListings} /> : null}

      <LearnGrowAchieve />

      {publishedNotesCount === 0 ? (
        <EmptyMarketplaceCard />
      ) : (
        <PublishNotesSection
          listings={publishListings}
          middle={
            <>
              <section className="mb-4">
                <CourseSearchBar variant="homepage" />
              </section>
              <CourseCodePills courses={coursePills} variant="homepage" />
            </>
          }
        />
      )}
    </>
  );
}
