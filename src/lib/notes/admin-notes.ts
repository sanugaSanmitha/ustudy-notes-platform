import { getCourseTitlesByCode } from '@/lib/courses/catalog';
import { adminClient } from '@/lib/supabase/admin';
import { extractMaterialTags } from '@/lib/notes/material-tags';

export type NoteListingStatus = 'pending_review' | 'published' | 'rejected';

export type AdminNoteListItem = {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  courseCode: string;
  courseTitle: string | null;
  verifiedGrade: string | null;
  title: string;
  description: string | null;
  professor: string | null;
  academicYear: string;
  semester: string;
  language: string;
  priceHkd: number;
  zipFilename: string;
  zipSizeBytes: number;
  fileNames: string[];
  fileCount: number;
  materialTags: string[];
  status: NoteListingStatus;
  createdAt: string;
  reviewedAt: string | null;
  publishedAt: string | null;
  reviewerName: string | null;
};

export type AdminNoteListingDetail = AdminNoteListItem & {
  adminNotes: string | null;
  rejectReason: string | null;
  rejectComment: string | null;
  zipStorageBucket: string | null;
  zipStoragePath: string | null;
  reviewerEmail: string | null;
};

export type AdminNoteListingStats = {
  pending: number;
  published: number;
  rejected: number;
  publishedToday: number;
  rejectedToday: number;
};

const LISTING_SELECT = `
  id,
  user_id,
  course_code,
  title,
  description,
  professor,
  academic_year,
  semester,
  language,
  price_hkd,
  zip_filename,
  zip_size_bytes,
  file_names,
  file_count,
  status,
  created_at,
  reviewed_at,
  published_at,
  reviewed_by,
  admin_notes,
  reject_reason,
  reject_comment,
  zip_storage_bucket,
  zip_storage_path
`;

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
  status: NoteListingStatus;
  created_at: string;
  reviewed_at: string | null;
  published_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  reject_reason: string | null;
  reject_comment: string | null;
  zip_storage_bucket: string | null;
  zip_storage_path: string | null;
};

function startOfUtcDayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

async function loadUserMap(userIds: string[]) {
  const usersById = new Map<string, { email: string | null; full_name: string | null }>();
  if (userIds.length === 0) {
    return usersById;
  }

  const { data: users } = await adminClient.from('users').select('id, email, full_name').in('id', userIds);
  (users || []).forEach((user) => {
    usersById.set(user.id, { email: user.email, full_name: user.full_name });
  });

  return usersById;
}

async function loadVerifiedGradeMap(listings: Array<{ user_id: string; course_code: string }>) {
  const gradeByUserCourse = new Map<string, string>();
  if (listings.length === 0) {
    return gradeByUserCourse;
  }

  const courseCodes = Array.from(new Set(listings.map((row) => row.course_code)));
  const userIds = Array.from(new Set(listings.map((row) => row.user_id)));

  const { data: verifiedGrades } = await adminClient
    .from('verified_courses')
    .select('user_id, course_code, grade')
    .in('course_code', courseCodes)
    .in('user_id', userIds);

  (verifiedGrades || []).forEach((row) => {
    gradeByUserCourse.set(`${row.user_id}:${row.course_code}`, row.grade as string);
  });

  return gradeByUserCourse;
}

function mapListingRow(
  row: ListingRow,
  usersById: Map<string, { email: string | null; full_name: string | null }>,
  gradeByUserCourse: Map<string, string>,
  courseTitleByCode: Map<string, string>,
  includeReviewFields = false
): AdminNoteListItem | AdminNoteListingDetail {
  const user = usersById.get(row.user_id);
  const reviewer = row.reviewed_by ? usersById.get(row.reviewed_by) : null;
  const fileNames = Array.isArray(row.file_names) ? row.file_names : [];

  const base: AdminNoteListItem = {
    id: row.id,
    userId: row.user_id,
    userEmail: user?.email || null,
    userName: user?.full_name || null,
    courseCode: row.course_code,
    courseTitle: courseTitleByCode.get(row.course_code) || null,
    verifiedGrade: gradeByUserCourse.get(`${row.user_id}:${row.course_code}`) || null,
    title: row.title,
    description: row.description,
    professor: row.professor,
    academicYear: row.academic_year,
    semester: row.semester,
    language: row.language,
    priceHkd: Number(row.price_hkd),
    zipFilename: row.zip_filename,
    zipSizeBytes: row.zip_size_bytes,
    fileNames,
    fileCount: row.file_count,
    materialTags: extractMaterialTags(fileNames),
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    publishedAt: row.published_at,
    reviewerName: reviewer?.full_name || reviewer?.email || null,
  };

  if (!includeReviewFields) {
    return base;
  }

  return {
    ...base,
    adminNotes: row.admin_notes,
    rejectReason: row.reject_reason,
    rejectComment: row.reject_comment,
    zipStorageBucket: row.zip_storage_bucket,
    zipStoragePath: row.zip_storage_path,
    reviewerEmail: reviewer?.email || null,
  };
}

export async function fetchAdminNoteListingStats(): Promise<AdminNoteListingStats> {
  const todayStart = startOfUtcDayIso();

  const [pendingResult, publishedResult, rejectedResult, publishedTodayResult, rejectedTodayResult] = await Promise.all([
    adminClient.from('note_listings').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    adminClient.from('note_listings').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    adminClient.from('note_listings').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    adminClient
      .from('note_listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', todayStart),
    adminClient
      .from('note_listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .gte('reviewed_at', todayStart),
  ]);

  return {
    pending: pendingResult.count || 0,
    published: publishedResult.count || 0,
    rejected: rejectedResult.count || 0,
    publishedToday: publishedTodayResult.count || 0,
    rejectedToday: rejectedTodayResult.count || 0,
  };
}

export async function listAdminNoteListings(options: {
  status?: NoteListingStatus | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = adminClient
    .from('note_listings')
    .select(LISTING_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  const status = options.status || 'pending_review';
  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const search = options.search?.trim();
  if (search) {
    query = query.or(
      `course_code.ilike.%${search}%,title.ilike.%${search}%,zip_filename.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    if (error.message.includes('relation "public.note_listings" does not exist')) {
      return {
        ok: false as const,
        missingMigration: '016_note_listings.sql',
        error,
      };
    }
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      return {
        ok: false as const,
        missingMigration: '024_note_listing_review.sql',
        error,
      };
    }
    return { ok: false as const, error };
  }

  const rows = (data || []) as ListingRow[];
  const userIds = Array.from(
    new Set(rows.flatMap((row) => [row.user_id, row.reviewed_by].filter(Boolean) as string[]))
  );
  const [usersById, gradeByUserCourse, courseTitleByCode] = await Promise.all([
    loadUserMap(userIds),
    loadVerifiedGradeMap(rows),
    getCourseTitlesByCode(rows.map((row) => row.course_code)),
  ]);

  const listings = rows.map((row) => mapListingRow(row, usersById, gradeByUserCourse, courseTitleByCode));

  const total = count || 0;

  return {
    ok: true as const,
    listings,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function fetchAdminNoteListingDetail(listingId: string) {
  const { data, error } = await adminClient
    .from('note_listings')
    .select(LISTING_SELECT)
    .eq('id', listingId)
    .maybeSingle();

  if (error) {
    if (error.message.includes('relation "public.note_listings" does not exist')) {
      return { ok: false as const, notFound: true, missingMigration: '016_note_listings.sql', error };
    }
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      return { ok: false as const, missingMigration: '024_note_listing_review.sql', error };
    }
    return { ok: false as const, error };
  }

  if (!data) {
    return { ok: false as const, notFound: true };
  }

  const row = data as ListingRow;
  const userIds = [row.user_id, row.reviewed_by].filter(Boolean) as string[];
  const [usersById, gradeByUserCourse, courseTitleByCode] = await Promise.all([
    loadUserMap(userIds),
    loadVerifiedGradeMap([row]),
    getCourseTitlesByCode([row.course_code]),
  ]);

  const listing = mapListingRow(row, usersById, gradeByUserCourse, courseTitleByCode, true) as AdminNoteListingDetail;

  return { ok: true as const, listing };
}

export async function findNextPendingNoteListingId(excludeListingId?: string) {
  let query = adminClient
    .from('note_listings')
    .select('id')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
    .limit(1);

  if (excludeListingId) {
    query = query.neq('id', excludeListingId);
  }

  const { data } = await query.maybeSingle();
  return data?.id || null;
}

export async function reviewAdminNoteListing(input: {
  listingId: string;
  reviewerId: string;
  action: 'approve' | 'reject';
  adminNotes?: string | null;
  rejectReason?: string | null;
  rejectComment?: string | null;
}) {
  const detailResult = await fetchAdminNoteListingDetail(input.listingId);
  if (!detailResult.ok) {
    return detailResult;
  }

  const listing = detailResult.listing;

  if (listing.status !== 'pending_review') {
    return {
      ok: false as const,
      code: 'ALREADY_REVIEWED' as const,
      message: `This listing has already been ${listing.status === 'published' ? 'published' : 'rejected'}.`,
    };
  }

  const nowIso = new Date().toISOString();
  const newStatus = input.action === 'approve' ? 'published' : 'rejected';

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    reviewed_by: input.reviewerId,
    reviewed_at: nowIso,
    updated_at: nowIso,
    admin_notes: input.action === 'approve' ? input.adminNotes || null : null,
    reject_reason: input.action === 'reject' ? input.rejectReason || null : null,
    reject_comment: input.action === 'reject' ? input.rejectComment || null : null,
    published_at: input.action === 'approve' ? nowIso : null,
  };

  const { data: updated, error: updateError } = await adminClient
    .from('note_listings')
    .update(updatePayload)
    .eq('id', input.listingId)
    .eq('status', 'pending_review')
    .select('id, status, title, course_code, user_id')
    .maybeSingle();

  if (updateError) {
    if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
      return { ok: false as const, missingMigration: '024_note_listing_review.sql', error: updateError };
    }
    return { ok: false as const, error: updateError };
  }

  if (!updated) {
    return {
      ok: false as const,
      code: 'ALREADY_REVIEWED' as const,
      message: 'This listing was already reviewed by another admin.',
    };
  }

  const nextPendingId = await findNextPendingNoteListingId(input.listingId);

  return {
    ok: true as const,
    listing: detailResult.listing,
    updated,
    nextPendingId,
  };
}
