import { unstable_cache } from 'next/cache';
import { normalizeCourseCode } from '@/lib/grades/review-model';
import { formatGradeRange } from '@/lib/notes/listing-utils';
import { adminClient } from '@/lib/supabase/admin';

type ListingRow = {
  id: string;
  user_id: string;
  course_code: string;
  title: string;
  description: string | null;
  professor: string | null;
  academic_year: string;
  semester: string;
  language: string;
  price_hkd: number;
  zip_filename: string;
  zip_size_bytes: number;
  file_names: string[] | null;
  file_count: number;
  created_at: string;
};

export type EnrichedListing = ListingRow & {
  grade: string;
  sellerLabel: string;
};

export type PublishedCourseSummary = {
  courseCode: string;
  courseTitle: string | null;
  sellerCount: number;
  listingCount: number;
  latestListingAt: string;
  gradeRangeLabel: string | null;
};

const LISTING_SELECT =
  'id, user_id, course_code, title, description, professor, academic_year, semester, language, price_hkd, zip_filename, zip_size_bytes, file_names, file_count, created_at';

const MARKETPLACE_REVALIDATE_SECONDS = 60;

async function enrichListingsWithGrades(listings: ListingRow[]): Promise<EnrichedListing[]> {
  if (listings.length === 0) {
    return [];
  }

  const courseCodes = Array.from(new Set(listings.map((row) => row.course_code)));
  const userIds = Array.from(new Set(listings.map((row) => row.user_id)));

  const [{ data: verifiedGrades }, { data: sellers }] = await Promise.all([
    adminClient
      .from('verified_courses')
      .select('user_id, course_code, grade')
      .in('course_code', courseCodes)
      .in('user_id', userIds),
    adminClient.from('users').select('id, anonymous_id, is_seller').in('id', userIds),
  ]);

  const gradeByUserCourse = new Map(
    (verifiedGrades || []).map((row) => [`${row.user_id}:${row.course_code}`, row.grade as string])
  );

  const sellerById = new Map(
    (sellers || []).map((row) => [
      row.id,
      row.anonymous_id ? `Seller ${row.anonymous_id}` : 'Verified Seller',
    ])
  );

  return listings.map((listing) => ({
    ...listing,
    file_names: Array.isArray(listing.file_names) ? listing.file_names : [],
    grade: gradeByUserCourse.get(`${listing.user_id}:${listing.course_code}`) || 'B',
    sellerLabel: sellerById.get(listing.user_id) || 'Verified Seller',
  }));
}

type CourseListingStats = {
  courseCode: string;
  listingCount: number;
  sellerCount: number;
  latestListingAt: string;
};

async function fetchPublishedCourseListingStats(): Promise<CourseListingStats[]> {
  const { data, error } = await adminClient.rpc('get_published_course_listing_stats');

  if (!error && Array.isArray(data)) {
    return (data as Array<{
      course_code: string;
      listing_count: number | string;
      seller_count: number | string;
      latest_listing_at: string;
    }>)
      .map((row) => {
        const courseCode = normalizeCourseCode(row.course_code);
        if (!courseCode) return null;
        return {
          courseCode,
          listingCount: Number(row.listing_count) || 0,
          sellerCount: Number(row.seller_count) || 0,
          latestListingAt: row.latest_listing_at,
        };
      })
      .filter((row): row is CourseListingStats => row !== null);
  }

  const { data: rows, error: fallbackError } = await adminClient
    .from('note_listings')
    .select('course_code, user_id, created_at')
    .eq('status', 'published');

  if (fallbackError) {
    if (fallbackError.message.includes('relation "public.note_listings" does not exist')) {
      return [];
    }
    throw fallbackError;
  }

  const byCourse = new Map<string, CourseListingStats & { sellers: Set<string> }>();
  for (const row of rows || []) {
    const courseCode = normalizeCourseCode(row.course_code);
    if (!courseCode) continue;

    const existing = byCourse.get(courseCode);
    if (!existing) {
      byCourse.set(courseCode, {
        courseCode,
        listingCount: 1,
        sellerCount: 1,
        latestListingAt: row.created_at,
        sellers: new Set([row.user_id]),
      });
      continue;
    }

    existing.listingCount += 1;
    existing.sellers.add(row.user_id);
    existing.sellerCount = existing.sellers.size;
    if (new Date(row.created_at).getTime() > new Date(existing.latestListingAt).getTime()) {
      existing.latestListingAt = row.created_at;
    }
  }

  return Array.from(byCourse.values()).map((row) => ({
    courseCode: row.courseCode,
    listingCount: row.listingCount,
    sellerCount: row.sellerCount,
    latestListingAt: row.latestListingAt,
  }));
}

async function fetchPublishedCourseSummaries(): Promise<PublishedCourseSummary[]> {
  const stats = await fetchPublishedCourseListingStats();
  if (stats.length === 0) {
    return [];
  }

  const courseCodes = stats.map((row) => row.courseCode);

  const [{ data: verifiedGrades }, { data: catalogCourses }] = await Promise.all([
    adminClient
      .from('verified_courses')
      .select('course_code, grade')
      .in('course_code', courseCodes),
    adminClient.from('courses').select('course_code, course_title').in('course_code', courseCodes),
  ]);

  const titleByCode = new Map(
    (catalogCourses || []).map((row) => [normalizeCourseCode(row.course_code), row.course_title as string])
  );

  const gradesByCourse = new Map<string, string[]>();
  for (const row of verifiedGrades || []) {
    const code = normalizeCourseCode(row.course_code);
    if (!code) continue;
    const grades = gradesByCourse.get(code) || [];
    grades.push(row.grade as string);
    gradesByCourse.set(code, grades);
  }

  return stats
    .map((row) => ({
      courseCode: row.courseCode,
      courseTitle: titleByCode.get(row.courseCode) || null,
      sellerCount: row.sellerCount,
      listingCount: row.listingCount,
      latestListingAt: row.latestListingAt,
      gradeRangeLabel: formatGradeRange(gradesByCourse.get(row.courseCode) || []),
    }))
    .sort((a, b) => new Date(b.latestListingAt).getTime() - new Date(a.latestListingAt).getTime());
}

const getCachedPublishedCourseSummaries = unstable_cache(
  fetchPublishedCourseSummaries,
  ['published-course-summaries'],
  { revalidate: MARKETPLACE_REVALIDATE_SECONDS, tags: ['marketplace'] }
);

export async function getPublishedCourseSummaries(): Promise<PublishedCourseSummary[]> {
  return getCachedPublishedCourseSummaries();
}

export async function getFeaturedCourses(limit = 3): Promise<PublishedCourseSummary[]> {
  const summaries = await getPublishedCourseSummaries();
  return summaries.slice(0, limit);
}

async function fetchLatestPublishedListings(limit: number): Promise<EnrichedListing[]> {
  const { data, error } = await adminClient
    .from('note_listings')
    .select(LISTING_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.includes('relation "public.note_listings" does not exist')) {
      return [];
    }
    throw error;
  }

  return enrichListingsWithGrades((data || []) as ListingRow[]);
}

const getCachedLatestPublishedListings = unstable_cache(
  async () => fetchLatestPublishedListings(8),
  ['latest-published-listings'],
  { revalidate: MARKETPLACE_REVALIDATE_SECONDS, tags: ['marketplace'] }
);

const getCachedHomepagePublishListings = unstable_cache(
  async () => fetchLatestPublishedListings(40),
  ['homepage-publish-listings'],
  { revalidate: MARKETPLACE_REVALIDATE_SECONDS, tags: ['marketplace'] }
);

async function countPublishedNotes() {
  const { count, error } = await adminClient
    .from('note_listings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  if (error) {
    return 0;
  }

  return count || 0;
}

const getCachedPublishedNotesCount = unstable_cache(
  countPublishedNotes,
  ['published-notes-count'],
  { revalidate: MARKETPLACE_REVALIDATE_SECONDS, tags: ['marketplace'] }
);

export type CourseListingCount = {
  courseCode: string;
  listingCount: number;
};

const getCachedPublishedCourseListingStats = unstable_cache(
  fetchPublishedCourseListingStats,
  ['published-course-listing-stats'],
  { revalidate: MARKETPLACE_REVALIDATE_SECONDS, tags: ['marketplace'] }
);

async function fetchPublishedListingCountsByCourse(): Promise<CourseListingCount[]> {
  const stats = await getCachedPublishedCourseListingStats();
  return stats
    .map(({ courseCode, listingCount }) => ({ courseCode, listingCount }))
    .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
}

const getCachedPublishedListingCountsByCourse = unstable_cache(
  fetchPublishedListingCountsByCourse,
  ['published-listing-counts-by-course'],
  { revalidate: MARKETPLACE_REVALIDATE_SECONDS, tags: ['marketplace'] }
);

export async function getPublishedListingCountsByCourse(): Promise<CourseListingCount[]> {
  return getCachedPublishedListingCountsByCourse();
}

export async function getLatestPublishedListings(limit = 8): Promise<EnrichedListing[]> {
  if (limit === 8) {
    return getCachedLatestPublishedListings();
  }
  return fetchLatestPublishedListings(limit);
}

export async function getHomepageMarketplaceData() {
  const [publishedNotesCount, publishListings] = await Promise.all([
    getCachedPublishedNotesCount(),
    getCachedHomepagePublishListings(),
  ]);

  return {
    publishedNotesCount,
    latestListings: publishListings.slice(0, 8),
    publishListings,
  };
}

async function fetchPublishedListingsForCourse(courseCode: string): Promise<EnrichedListing[]> {
  const code = normalizeCourseCode(courseCode);
  if (!code) return [];

  const { data, error } = await adminClient
    .from('note_listings')
    .select(LISTING_SELECT)
    .eq('course_code', code)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    if (error.message.includes('relation "public.note_listings" does not exist')) {
      return [];
    }
    throw error;
  }

  return enrichListingsWithGrades((data || []) as ListingRow[]);
}

export async function getPublishedListingsForCourse(courseCode: string): Promise<EnrichedListing[]> {
  const code = normalizeCourseCode(courseCode);
  if (!code) return [];

  return unstable_cache(
    async () => fetchPublishedListingsForCourse(code),
    [`published-listings-${code}`],
    { revalidate: MARKETPLACE_REVALIDATE_SECONDS, tags: ['marketplace', `marketplace-${code}`] }
  )();
}

export async function getPublishedListingById(listingId: string): Promise<EnrichedListing | null> {
  return unstable_cache(
    async () => fetchPublishedListingById(listingId),
    [`published-listing-${listingId}`],
    {
      revalidate: MARKETPLACE_REVALIDATE_SECONDS,
      tags: ['marketplace', `marketplace-listing-${listingId}`],
    }
  )();
}

async function fetchPublishedListingById(listingId: string): Promise<EnrichedListing | null> {
  const { data, error } = await adminClient
    .from('note_listings')
    .select(LISTING_SELECT)
    .eq('id', listingId)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    if (error.message.includes('relation "public.note_listings" does not exist')) {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  const [listing] = await enrichListingsWithGrades([data as ListingRow]);
  return listing || null;
}
