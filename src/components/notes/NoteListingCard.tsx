'use client';

import Link from 'next/link';
import { Check, FileText } from 'lucide-react';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { GradeBadgeCompact } from '@/components/marketplace/GradeBadgeCompact';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getGradeTier } from '@/lib/materials/grade-tiers';
import { formatListingDate, formatRelativeTime } from '@/lib/notes/listing-utils';
import { extractMaterialTags } from '@/lib/notes/material-tags';
import { cn } from '@/lib/utils';
import type { EnrichedListing } from '@/lib/notes/marketplace';

export type NoteListingDisplay = EnrichedListing;

type NoteListingCardProps = {
  listing: NoteListingDisplay;
  courseCode?: string;
  showCourseCode?: boolean;
  variant?: 'default' | 'homepage' | 'featured';
};

const homepageActionClassName =
  'h-9 rounded-[18px] border-0 bg-[#d9d9d9] px-4 text-[14px] font-normal text-black hover:bg-[#cfcfcf]';

export function NoteListingCard({
  listing,
  courseCode,
  showCourseCode = false,
  variant = 'default',
}: NoteListingCardProps) {
  const { t } = useLocale();
  const code = courseCode || listing.course_code;
  const tier = getGradeTier(listing.grade);
  const tags = extractMaterialTags(listing.file_names || []);
  const detailHref = `/notes/${listing.id}`;

  if (variant === 'featured') {
    const fileCount = listing.file_count || listing.file_names?.length || 0;

    return (
      <Card className="h-[188px] w-[min(237px,calc(100vw-3rem))] overflow-hidden rounded-xl border border-[#ededf9] bg-white py-0 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.05)] ring-0">
        <div className="relative h-[54px] bg-[#eff6ff] px-2.5 pt-1.5 pr-[92px]">
          {showCourseCode && code ? (
            <p className="truncate text-[15px] font-normal leading-normal text-black">{code}</p>
          ) : null}
          <h3 className="truncate text-[12px] font-normal leading-normal text-black">{listing.title}</h3>
          <span className="absolute right-2 top-1.5 rounded-full bg-white/80 px-3 py-0.5 text-[12px] text-black shadow-sm">
            {t('noteGrades')} {listing.grade}
          </span>
        </div>

        <div className="flex h-[calc(188px-54px)] flex-col px-2.5 pb-3 pt-2">
          <div className="flex items-start justify-between gap-2 border-b border-[#ededf9] pb-2">
            <div className="min-w-0">
              <p className="text-[12px] font-normal leading-none text-black">{t('noteFiles')}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-black">
                <span className="relative size-[9px] overflow-clip">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/file-count.svg" alt="" width={9} height={9} className="size-full" />
                </span>
                {fileCount}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-normal leading-none text-black">{t('noteLanguage')}</p>
              <p className="mt-1 truncate text-[10px] font-medium text-black">{listing.language}</p>
            </div>
            <p className="shrink-0 rounded-md border border-[#eff6ff] bg-white/80 px-1 py-1 text-[12px] text-black shadow-sm">
              HK$ {Number(listing.price_hkd).toFixed(0)}
            </p>
          </div>

          <div className="mt-2 flex items-center gap-2 text-[10px] text-black">
            <span className="relative h-[12px] w-[11px] overflow-clip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/calendar-small.svg" alt="" width={11} height={12} className="size-full" />
            </span>
            {listing.semester} {listing.academic_year}
          </div>

          <Link
            href={detailHref}
            className="mt-auto inline-flex h-[26px] w-full items-center justify-center gap-2 text-[12px] text-[#004ac6]"
          >
            {t('noteViewMaterials')}
            <span className="relative size-[9px] overflow-clip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/view-materials-arrow.svg" alt="" width={9} height={9} className="size-full" />
            </span>
          </Link>
        </div>
      </Card>
    );
  }

  if (variant === 'homepage') {
    const displayTags = tags.length > 0 ? tags : [t('noteStudyMaterial')];

    return (
      <Card className="overflow-hidden rounded-[20px] border border-[#ededf9] bg-white py-0 shadow-none ring-0">
        <div className="flex min-h-[213px] flex-col p-5 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              {showCourseCode && code && (
                <p className="text-[12px] font-bold text-[#1f2f66]">{code}</p>
              )}
              <h3 className="mt-1 break-words text-[14px] font-normal text-black">{listing.title}</h3>
              <p className="mt-1 text-[12px] font-normal text-black">
                {listing.semester} {listing.academic_year}
              </p>
            </div>
            <GradeBadgeCompact
              grade={listing.grade}
              showBadgeIcon={false}
              variant="figma"
              className="w-full max-w-none sm:w-[216px]"
            />
          </div>

          <ul className="mt-3 flex flex-wrap gap-2">
            {displayTags.map((tag) => (
              <li
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#f5fdf8] px-2.5 py-0.5 text-[14px] font-normal text-[#224233]"
              >
                <span aria-hidden className="text-[14px] font-normal leading-none">
                  ✓
                </span>
                {tag}
              </li>
            ))}
          </ul>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] font-medium text-black sm:grid-cols-4">
            <div>
              <dt className="font-medium">{t('noteSeller')}</dt>
              <dd>{listing.sellerLabel}</dd>
            </div>
            <div>
              <dt className="font-medium">{t('noteFiles')}</dt>
              <dd className="inline-flex items-center gap-1">
                <span className="relative size-[9px] overflow-clip">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/file-count.svg" alt="" width={9} height={9} className="size-full" />
                </span>
                {listing.file_count || listing.file_names?.length || 0}
              </dd>
            </div>
            <div>
              <dt className="font-medium">{t('noteLanguage')}</dt>
              <dd>{listing.language}</dd>
            </div>
            <div>
              <dt className="font-medium">{t('noteUploaded')}</dt>
              <dd>{formatListingDate(listing.created_at)}</dd>
            </div>
          </dl>

          <div className="mt-auto flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] font-normal text-black">HK${Number(listing.price_hkd).toFixed(0)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" className={homepageActionClassName}>
                <Link href={detailHref}>{t('noteView')}</Link>
              </Button>
              <AddToCartButton listingId={listing.id} iconOnly />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200 bg-white transition-shadow hover:shadow-md">
      <div className="flex">
        <div
          className="w-1.5 shrink-0"
          style={{ background: `linear-gradient(180deg, ${tier.color} 0%, ${tier.secondaryColor} 100%)` }}
        />

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {showCourseCode && code && (
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{code}</p>
              )}
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{listing.title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {listing.semester} {listing.academic_year}
                {listing.professor ? ` · ${listing.professor}` : ''}
              </p>
            </div>
            <GradeBadgeCompact grade={listing.grade} size="sm" />
          </div>

          {listing.description && (
            <p className="mt-3 line-clamp-2 text-sm text-slate-600">{listing.description}</p>
          )}

          {tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                >
                  <Check className="size-3" />
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <dl className={cn('mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500 sm:grid-cols-4')}>
            <div>
              <dt className="font-medium text-slate-700">{t('noteSeller')}</dt>
              <dd>{listing.sellerLabel}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">{t('noteFiles')}</dt>
              <dd className="inline-flex items-center gap-1">
                <FileText className="size-3" />
                {listing.file_count || listing.file_names?.length || 0}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">{t('noteLanguage')}</dt>
              <dd>{listing.language}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">{t('noteUploaded')}</dt>
              <dd>{formatRelativeTime(listing.created_at)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-2xl font-bold text-slate-900">HK${Number(listing.price_hkd).toFixed(0)}</p>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={detailHref}>{t('noteView')}</Link>
              </Button>
              <AddToCartButton
                listingId={listing.id}
                label={t('noteBuy')}
                redirectTo="/checkout"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
