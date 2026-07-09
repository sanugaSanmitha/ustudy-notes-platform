'use client';

import { useMemo, useState } from 'react';
import { NoteListingCard } from '@/components/notes/NoteListingCard';
import { Button } from '@/components/ui/button';
import type { EnrichedListing } from '@/lib/notes/marketplace';
import { sortListings, type ListingSortOption } from '@/lib/notes/listing-utils';

const SORT_OPTIONS: Array<{ value: ListingSortOption; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'grade', label: 'Highest grade' },
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'price_desc', label: 'Highest price' },
];

type CourseListingsSectionProps = {
  listings: EnrichedListing[];
  courseCode: string;
};

export function CourseListingsSection({ listings, courseCode }: CourseListingsSectionProps) {
  const [sort, setSort] = useState<ListingSortOption>('grade');

  const sortedListings = useMemo(() => sortListings(listings, sort), [listings, sort]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Available notes</h2>
          <p className="mt-1 text-sm text-slate-500">
            {listings.length} seller{listings.length === 1 ? '' : 's'} · compare grades, price, and materials
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={sort === option.value ? 'default' : 'outline'}
              className={sort === option.value ? 'bg-blue-600 hover:bg-blue-700' : ''}
              onClick={() => setSort(option.value)}
            >
              {option.label}
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
