import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, FileText, ShieldCheck } from 'lucide-react';
import { GradeBadgeCompact } from '@/components/marketplace/GradeBadgeCompact';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getCoursesByCode } from '@/lib/courses/catalog';
import { formatRelativeTime } from '@/lib/notes/listing-utils';
import { extractMaterialTags } from '@/lib/notes/material-tags';
import { getPublishedListingById } from '@/lib/notes/marketplace';

export const revalidate = 60;

type PageProps = {
  params: { id: string };
};

export default async function NoteListingDetailPage({ params }: PageProps) {
  const listing = await getPublishedListingById(params.id);

  if (!listing) {
    notFound();
  }

  const catalog = await getCoursesByCode(listing.course_code);
  const tags = extractMaterialTags(listing.file_names || []);
  const fileNames = listing.file_names || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href={`/courses/${listing.course_code}`} className="text-sm text-blue-600 hover:underline">
        ← Back to {listing.course_code}
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{listing.course_code}</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">{listing.title}</h1>
              {catalog.primary && (
                <p className="mt-2 text-lg text-slate-600">{catalog.primary.courseTitle}</p>
              )}
              <p className="mt-2 text-sm text-slate-500">
                {listing.semester} {listing.academic_year}
                {listing.professor ? ` · ${listing.professor}` : ''}
              </p>
            </div>
            <GradeBadgeCompact grade={listing.grade} size="lg" />
          </div>

          {listing.description && (
            <Card className="mt-6 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Description</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{listing.description}</p>
            </Card>
          )}

          <Card className="mt-6 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Contains</h2>
            {tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800"
                  >
                    <Check className="size-3.5" />
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            {fileNames.length > 0 && (
              <div className="mt-5">
                <p className="text-sm font-medium text-slate-700">
                  {fileNames.length} file{fileNames.length === 1 ? '' : 's'} included
                </p>
                <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3">
                  {fileNames.slice(0, 20).map((fileName) => (
                    <li key={fileName} className="flex items-center gap-2 text-sm text-slate-600">
                      <FileText className="size-4 shrink-0 text-slate-400" />
                      <span className="truncate">{fileName}</span>
                    </li>
                  ))}
                  {fileNames.length > 20 && (
                    <li className="text-xs text-slate-400">+{fileNames.length - 20} more files</li>
                  )}
                </ul>
              </div>
            )}
          </Card>

          <Card className="mt-6 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Trust</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                Grade verified for {listing.course_code}
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                {listing.sellerLabel}
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                Reviewed before publish
              </li>
            </ul>
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6" id="buy">
            <p className="text-sm text-slate-500">Price</p>
            <p className="mt-1 text-4xl font-bold text-slate-900">HK${Number(listing.price_hkd).toFixed(0)}</p>
            <dl className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between gap-4">
                <dt>Seller</dt>
                <dd className="font-medium text-slate-900">{listing.sellerLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Uploaded</dt>
                <dd>{formatRelativeTime(listing.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Language</dt>
                <dd>{listing.language}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Files</dt>
                <dd>{listing.file_count || fileNames.length}</dd>
              </div>
            </dl>

            <Button className="mt-6 w-full bg-blue-600 hover:bg-blue-700" disabled>
              Buy now — checkout coming soon
            </Button>
            <p className="mt-3 text-center text-xs text-slate-400">
              Secure payment and instant download will be available here.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
