import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { HoverMarqueeText } from '@/components/ui/HoverMarqueeText';
import { formatListingDate } from '@/lib/notes/listing-utils';
import type { EnrichedListing } from '@/lib/notes/marketplace';

const MAX_ROWS = 4;

type CourseNotesTableCardProps = {
  courseCode: string;
  listings: EnrichedListing[];
};

export function CourseNotesTableCard({ courseCode, listings }: CourseNotesTableCardProps) {
  const visible = listings.slice(0, MAX_ROWS);
  const courseHref = `/courses/${courseCode}`;

  return (
    <Card className="gap-0 overflow-hidden rounded-[20px] border border-[#ededf9] bg-white py-0 shadow-none ring-0">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <Link href={courseHref} className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[20px] font-normal leading-8 text-black">{courseCode}</span>
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e6e6e6] text-[10px] font-normal leading-none text-black">
            {listings.length}
          </span>
        </Link>
        <Link
          href={courseHref}
          aria-label={`Open ${courseCode}`}
          className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-[#224233] hover:bg-[#f5fdf8]"
        >
          <Plus className="size-6" strokeWidth={2} />
        </Link>
      </div>

      <div className="overflow-x-auto px-4 pb-3">
        <table className="w-full min-w-[360px] table-fixed border-separate border-spacing-y-1 text-left">
          <colgroup>
            <col />
            <col className="w-[52px]" />
            <col className="w-[40px]" />
            <col className="w-[88px]" />
            <col className="w-[56px]" />
          </colgroup>
          <thead>
            <tr className="text-[10px] font-medium text-black">
              <th className="pr-2 font-medium">File Name</th>
              <th className="px-1 font-medium">Files</th>
              <th className="px-1 font-medium">Grade</th>
              <th className="px-1 font-medium">Time</th>
              <th className="pl-1 font-medium">Full View</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((listing) => (
              <tr key={listing.id} className="text-[12px] font-normal text-black">
                <td className="min-w-0 overflow-hidden pr-2">
                  <HoverMarqueeText text={listing.title} />
                </td>
                <td className="whitespace-nowrap px-1">
                  <span className="inline-flex items-center gap-0.5">
                    <FileText className="size-3.5 shrink-0" strokeWidth={1.75} />
                    {listing.file_count || listing.file_names?.length || 0}
                  </span>
                </td>
                <td className="whitespace-nowrap px-1">{listing.grade}</td>
                <td className="whitespace-nowrap px-1">{formatListingDate(listing.created_at)}</td>
                <td className="whitespace-nowrap pl-1">
                  <Link href={`/notes/${listing.id}`} className="text-[#1f2f66] hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
