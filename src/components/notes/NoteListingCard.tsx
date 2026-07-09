import Link from 'next/link';
import { Check, FileText } from 'lucide-react';
import { GradeBadgeCompact } from '@/components/marketplace/GradeBadgeCompact';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getGradeTier } from '@/lib/materials/grade-tiers';
import { formatRelativeTime } from '@/lib/notes/listing-utils';
import { extractMaterialTags } from '@/lib/notes/material-tags';
import type { EnrichedListing } from '@/lib/notes/marketplace';

export type NoteListingDisplay = EnrichedListing;

type NoteListingCardProps = {
  listing: NoteListingDisplay;
  courseCode?: string;
  showCourseCode?: boolean;
};

export function NoteListingCard({ listing, courseCode, showCourseCode = false }: NoteListingCardProps) {
  const code = courseCode || listing.course_code;
  const tier = getGradeTier(listing.grade);
  const tags = extractMaterialTags(listing.file_names || []);
  const detailHref = `/notes/${listing.id}`;

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

          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500 sm:grid-cols-4">
            <div>
              <dt className="font-medium text-slate-700">Seller</dt>
              <dd>{listing.sellerLabel}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Files</dt>
              <dd className="inline-flex items-center gap-1">
                <FileText className="size-3" />
                {listing.file_count || listing.file_names?.length || 0}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Language</dt>
              <dd>{listing.language}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Uploaded</dt>
              <dd>{formatRelativeTime(listing.created_at)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-2xl font-bold text-slate-900">HK${Number(listing.price_hkd).toFixed(0)}</p>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={detailHref}>View</Link>
              </Button>
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Link href={detailHref}>Buy</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
