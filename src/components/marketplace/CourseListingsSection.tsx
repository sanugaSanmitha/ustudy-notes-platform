'use client';

import { useMemo, useState } from 'react';
import { NoteListingCard } from '@/components/notes/NoteListingCard';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';
import type { EnrichedListing } from '@/lib/notes/marketplace';
import { sortListings, type ListingSortOption } from '@/lib/notes/listing-utils';

type CourseListingsSectionProps = {
  listings: EnrichedListing[];
  courseCode: string;
};

export function CourseListingsSection({ listings, courseCode }: CourseListingsSectionProps) {
  const { t } = useLocale();
  const [sort, setSort] = useState<ListingSortOption>('grade');

  const sortOptions: Array<{ value: ListingSortOption; labelKey: MessageKey }> = [
    { value: 'newest', labelKey: 'courseListingsSortNewest' },
    { value: 'grade', labelKey: 'courseListingsSortGrade' },
    { value: 'price_asc', labelKey: 'courseListingsSortPriceAsc' },
    { value: 'price_desc', labelKey: 'courseListingsSortPriceDesc' },
  ];

  const sortedListings = useMemo(() => sortListings(listings, sort), [listings, sort]);
  const meta = (listings.length === 1 ? t('courseListingsMetaOne') : t('courseListingsMetaMany')).replace(
    '{count}',
    String(listings.length)
  );

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t('courseListingsTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500">{meta}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={sort === option.value ? 'default' : 'outline'}
              className={sort === option.value ? 'bg-blue-600 hover:bg-blue-700' : ''}
              onClick={() => setSort(option.value)}
            >
              {t(option.labelKey)}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {sortedListings.map((listing) => (
          <NoteListingCard key={listing.id} listing={listing} courseCode={courseCode} />
        ))}
      </div>
    </section>
  );
}
