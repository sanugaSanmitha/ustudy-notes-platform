'use client';

import { useRef } from 'react';
import { NoteListingCard } from '@/components/notes/NoteListingCard';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { EnrichedListing } from '@/lib/notes/marketplace';

type FeaturedListingsCarouselProps = {
  listings: EnrichedListing[];
};

export function FeaturedListingsCarousel({ listings }: FeaturedListingsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLocale();

  if (listings.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;
    const amount = 237 + 24;
    container.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section className="mb-4">
      <h2 className="mb-3 text-[18px] font-normal text-black">{t('featuredLatestUploads')}</h2>
      <div className="rounded-[6px] bg-[rgba(217,217,217,0.2)] px-2 py-5 sm:px-4 sm:py-6 md:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label={t('featuredPrevNotes')}
            className="hidden size-[31px] shrink-0 items-center justify-center md:flex"
          >
            <span className="relative h-[34px] w-[14px] -scale-x-100 overflow-clip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/carousel-chevron.svg" alt="" width={14} height={34} className="size-full" />
            </span>
          </button>

          <div
            ref={scrollRef}
            className="flex min-w-0 flex-1 gap-4 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden"
          >
            {listings.map((listing) => (
              <div key={listing.id} className="shrink-0">
                <NoteListingCard listing={listing} showCourseCode variant="featured" />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label={t('featuredNextNotes')}
            className="hidden size-[31px] shrink-0 items-center justify-center md:flex"
          >
            <span className="relative h-[34px] w-[14px] overflow-clip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/carousel-chevron.svg" alt="" width={14} height={34} className="size-full" />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
