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

async function fetchPublishedCourseSummaries(): Promise<PublishedCourseSummary[]> {
  const { data, error } = await adminClient
    .from('note_listings')
    .select('course_code, user_id, created_at')
    .eq('status', 'published');

  if (error) {
    if (error.message.includes('relation "public.note_listings" does not exist')) {
      return [];
    }
    throw error;
  }

  const rows = data || [];
  if (rows.length === 0) {
    return [];
  }

  const byCourse = new Map<
    string,
    { sellers: Set<string>; listingCount: number; latestListingAt: string; userIds: Set<string> }
  >();

  for (const row of rows) {
    const code = normalizeCourseCode(row.course_code);
    if (!code) continue;

    const existing = byCourse.get(code) || {
      sellers: new Set<string>(),
      listingCount: 0,
      latestListingAt: row.created_at,
      userIds: new Set<string>(),
    };

    existing.sellers.add(row.user_id);
    existing.userIds.add(row.user_id);
    existing.listingCount += 1;
    if (new Date(row.created_at).getTime() > new Date(existing.latestListingAt).getTime()) {
      existing.latestListingAt = row.created_at;
    }
    byCourse.set(code, existing);
  }

  const courseCodes = Array.from(byCourse.keys());
  const allUserIds = Array.from(
    new Set(Array.from(byCourse.values()).flatMap((stats) => Array.from(stats.userIds)))
  );

  const [{ data: verifiedGrades }, { data: catalogCourses }] = await Promise.all([
    adminClient
      .from('verified_courses')
      .select('user_id, course_code, grade')
      .in('course_code', courseCodes)
      .in('user_id', allUserIds),
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

  const summaries: PublishedCourseSummary[] = [];

  for (const [courseCode, stats] of Array.from(byCourse.entries())) {
    summaries.push({
      courseCode,
      courseTitle: titleByCode.get(courseCode) || null,
      sellerCount: stats.sellers.size,
      listingCount: stats.listingCount,
      latestListingAt: stats.latestListingAt,
      gradeRangeLabel: formatGradeRange(gradesByCourse.get(courseCode) || []),
    });
  }

  return summaries.sort(
    (a, b) => new Date(b.latestListingAt).getTime() - new Date(a.latestListingAt).getTime()
  );
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

export async function getLatestPublishedListings(limit = 8): Promise<EnrichedListing[]> {
  if (limit === 8) {
    return getCachedLatestPublishedListings();
  }
  return fetchLatestPublishedListings(limit);
}

export async function getHomepageMarketplaceData() {
  const [courseSummaries, latestListings] = await Promise.all([
    getPublishedCourseSummaries(),
    getLatestPublishedListings(8),
  ]);

  const publishedNotesCount = courseSummaries.reduce((total, course) => total + course.listingCount, 0);

  return {
    publishedNotesCount,
    featuredCourses: courseSummaries.slice(0, 3),
    courseSummaries,
    latestListings,
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
