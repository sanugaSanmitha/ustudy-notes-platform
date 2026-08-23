'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { CourseNotesTableCard } from '@/components/marketplace/CourseNotesTableCard';
import { NoteListingCard } from '@/components/notes/NoteListingCard';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { cn } from '@/lib/utils';
import type { EnrichedListing } from '@/lib/notes/marketplace';

type PublishView = 'notes' | 'courses';

type PublishNotesSectionProps = {
  listings: EnrichedListing[];
  middle?: ReactNode;
};

const INITIAL_NOTE_CARDS = 8;
const INITIAL_COURSE_CARDS = 8;

function groupListingsByCourse(listings: EnrichedListing[]) {
  const groups: { courseCode: string; listings: EnrichedListing[] }[] = [];
  const indexByCode = new Map<string, number>();

  for (const listing of listings) {
    const existing = indexByCode.get(listing.course_code);
    if (existing === undefined) {
      indexByCode.set(listing.course_code, groups.length);
      groups.push({ courseCode: listing.course_code, listings: [listing] });
    } else {
      groups[existing].listings.push(listing);
    }
  }

  return groups;
}

export function PublishNotesSection({ listings, middle }: PublishNotesSectionProps) {
  const { t } = useLocale();
  const [view, setView] = useState<PublishView>('notes');
  const [showAll, setShowAll] = useState(false);

  const grouped = useMemo(() => groupListingsByCourse(listings), [listings]);

  if (listings.length === 0) {
    return null;
  }

  const visibleNotes = showAll ? listings : listings.slice(0, INITIAL_NOTE_CARDS);
  const visibleGroups = showAll ? grouped : grouped.slice(0, INITIAL_COURSE_CARDS);
  const canShowMore = view === 'notes' ? listings.length > INITIAL_NOTE_CARDS : grouped.length > INITIAL_COURSE_CARDS;

  const setViewMode = (next: PublishView) => {
    setView(next);
    setShowAll(false);
  };

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[18px] font-normal text-black">{t('publishNotesTitle')}</h2>
        <div className="relative inline-flex h-9 w-[114px] overflow-hidden rounded-[8px] border-2 border-[#a3a3a3] bg-white">
          <span
            aria-hidden
            className={cn(
              'absolute inset-y-0 w-1/2 bg-[#1f2f66] transition-transform duration-200',
              view === 'notes' ? 'translate-x-full' : 'translate-x-0'
            )}
          />
          <button
            type="button"
            onClick={() => setViewMode('courses')}
            aria-label={t('publishNotesGroupByCourse')}
            aria-pressed={view === 'courses'}
            className={cn(
              'relative z-10 flex h-full flex-1 items-center justify-center',
              view === 'courses' ? 'text-white' : 'text-[#a3a3a3] hover:text-[#1f2f66]'
            )}
          >
            <List className="size-5" strokeWidth={2} />
          </button>
          <span aria-hidden className="relative z-10 w-px self-stretch bg-[#a3a3a3]" />
          <button
            type="button"
            onClick={() => setViewMode('notes')}
            aria-label={t('publishNotesShowSeparately')}
            aria-pressed={view === 'notes'}
            className={cn(
              'relative z-10 flex h-full flex-1 items-center justify-center',
              view === 'notes' ? 'text-white' : 'text-[#a3a3a3] hover:text-[#1f2f66]'
            )}
          >
            <LayoutGrid className="size-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {middle ? <div className="mb-5">{middle}</div> : null}

      {view === 'notes' ? (
        <div className="grid gap-5 md:grid-cols-2 md:items-start">
          {visibleNotes.map((listing) => (
            <NoteListingCard key={listing.id} listing={listing} showCourseCode variant="homepage" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {visibleGroups.map((group) => (
            <CourseNotesTableCard
              key={group.courseCode}
              courseCode={group.courseCode}
              listings={group.listings}
            />
          ))}
        </div>
      )}

      {!showAll && canShowMore ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex h-[43px] items-center gap-2 rounded-[38px] bg-[rgba(217,217,217,0.3)] px-4 text-[14px] font-normal text-[#224233]"
          >
            <span className="flex size-[34px] items-center justify-center">
              <Plus className="size-6" strokeWidth={2} />
            </span>
            {t('showMore')}
          </button>
        </div>
      ) : null}
    </section>
  );
}
