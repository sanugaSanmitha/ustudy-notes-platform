import { revalidateTag } from 'next/cache';
import { normalizeCourseCode } from '@/lib/grades/review-model';

export function revalidateMarketplaceCaches(courseCode?: string, listingId?: string) {
  revalidateTag('marketplace');

  if (courseCode) {
    const code = normalizeCourseCode(courseCode);
    if (code) {
      revalidateTag(`marketplace-${code}`);
    }
  }

  if (listingId) {
    revalidateTag(`marketplace-listing-${listingId}`);
  }
}
