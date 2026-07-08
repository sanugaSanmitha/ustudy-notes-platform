import { adminClient } from '@/lib/supabase/admin';
import { SCHOOL_OPTIONS } from '@/lib/profile/constants';

export type VerificationStatus = 'verified' | 'pending' | 'rejected' | 'none';

export type AdminUserListItem = {
  id: string;
  email: string;
  fullName: string | null;
  school: string | null;
  anonymousId: string | null;
  isSeller: boolean;
  profileCompleted: boolean;
  verificationStatus: VerificationStatus;
  verifiedCourseCount: number;
  verificationRequestCount: number;
  adminReviewCount: number;
  lastRequestAt: string | null;
  createdAt: string;
};

function deriveVerificationStatus(input: {
  isSeller: boolean;
  latestVerificationStatus: string | null;
  hasPendingReview: boolean;
}): VerificationStatus {
  if (input.isSeller) return 'verified';
  if (input.hasPendingReview) return 'pending';
  if (input.latestVerificationStatus === 'rejected') return 'rejected';
  if (
    input.latestVerificationStatus === 'pending_review' ||
    input.latestVerificationStatus === 'manual_required'
  ) {
    return 'pending';
  }
  return 'none';
}

async function fetchUserAggregates(userIds: string[]) {
  if (userIds.length === 0) {
    return {
      verifiedCourseCounts: new Map<string, number>(),
      verificationCounts: new Map<string, number>(),
      adminReviewCounts: new Map<string, number>(),
      latestVerificationStatus: new Map<string, string>(),
      lastRequestAt: new Map<string, string>(),
      pendingReviewUserIds: new Set<string>(),
    };
  }

  const [verifiedCourses, verifications, adminReviews, pendingReviews] = await Promise.all([
    adminClient.from('verified_courses').select('user_id').in('user_id', userIds),
    adminClient
      .from('grade_verifications')
      .select('user_id, status, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false }),
    adminClient.from('admin_review_requests').select('user_id').in('user_id', userIds),
    adminClient
      .from('admin_review_requests')
      .select('user_id')
      .in('user_id', userIds)
      .in('status', ['pending', 'reviewing']),
  ]);

  const verifiedCourseCounts = new Map<string, number>();
  for (const row of verifiedCourses.data || []) {
    verifiedCourseCounts.set(row.user_id, (verifiedCourseCounts.get(row.user_id) || 0) + 1);
  }

  const verificationCounts = new Map<string, number>();
  const latestVerificationStatus = new Map<string, string>();
  const lastRequestAt = new Map<string, string>();
  for (const row of verifications.data || []) {
    verificationCounts.set(row.user_id, (verificationCounts.get(row.user_id) || 0) + 1);
    if (!latestVerificationStatus.has(row.user_id)) {
      latestVerificationStatus.set(row.user_id, row.status);
    }
    if (!lastRequestAt.has(row.user_id)) {
      lastRequestAt.set(row.user_id, row.created_at);
    }
  }

  const adminReviewCounts = new Map<string, number>();
  for (const row of adminReviews.data || []) {
    adminReviewCounts.set(row.user_id, (adminReviewCounts.get(row.user_id) || 0) + 1);
  }

  const pendingReviewUserIds = new Set((pendingReviews.data || []).map((row) => row.user_id));

  return {
    verifiedCourseCounts,
    verificationCounts,
    adminReviewCounts,
    latestVerificationStatus,
    lastRequestAt,
    pendingReviewUserIds,
  };
}

async function getUserIdsForVerificationFilter(status: VerificationStatus) {
  if (status === 'verified') {
    const { data } = await adminClient.from('users').select('id').eq('is_seller', true);
    return (data || []).map((row) => row.id);
  }

  if (status === 'pending') {
    const [pendingReviews, pendingVerifications] = await Promise.all([
      adminClient.from('admin_review_requests').select('user_id').in('status', ['pending', 'reviewing']),
      adminClient
        .from('grade_verifications')
        .select('user_id')
        .in('status', ['pending_review', 'manual_required']),
    ]);

    const ids = new Set<string>();
    for (const row of pendingReviews.data || []) ids.add(row.user_id);
    for (const row of pendingVerifications.data || []) ids.add(row.user_id);

    const { data: sellers } = await adminClient.from('users').select('id').eq('is_seller', true);
    for (const seller of sellers || []) ids.delete(seller.id);

    return Array.from(ids);
  }

  if (status === 'rejected') {
    const { data: sellers } = await adminClient.from('users').select('id').eq('is_seller', true);
    const sellerIds = new Set((sellers || []).map((row) => row.id));

    const { data: verifications } = await adminClient
      .from('grade_verifications')
      .select('user_id, status, created_at')
      .eq('status', 'rejected')
      .order('created_at', { ascending: false });

    const latestStatusByUser = new Map<string, string>();
    for (const row of verifications || []) {
      if (!latestStatusByUser.has(row.user_id)) {
        latestStatusByUser.set(row.user_id, row.status);
      }
    }

    return Array.from(latestStatusByUser.entries())
      .filter(([userId, latestStatus]) => latestStatus === 'rejected' && !sellerIds.has(userId))
      .map(([userId]) => userId);
  }

  const { data: sellers } = await adminClient.from('users').select('id').eq('is_seller', true);
  const sellerIds = new Set((sellers || []).map((row) => row.id));

  const { data: allUsers } = await adminClient.from('users').select('id');
  const candidateIds = (allUsers || []).map((row) => row.id).filter((id) => !sellerIds.has(id));

  if (candidateIds.length === 0) return [];

  const [reviews, verifications] = await Promise.all([
    adminClient.from('admin_review_requests').select('user_id').in('user_id', candidateIds),
    adminClient.from('grade_verifications').select('user_id').in('user_id', candidateIds),
  ]);

  const activeIds = new Set<string>();
  for (const row of reviews.data || []) activeIds.add(row.user_id);
  for (const row of verifications.data || []) activeIds.add(row.user_id);

  return candidateIds.filter((id) => !activeIds.has(id));
}

export async function listAdminUsers(options: {
  search?: string;
  school?: string;
  verification?: string;
  seller?: string;
  joinedFrom?: string;
  joinedTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const {
    search = '',
    school = 'all',
    verification = 'all',
    seller = 'all',
    joinedFrom,
    joinedTo,
    page = 1,
    pageSize = 25,
  } = options;

  let query = adminClient
    .from('users')
    .select('id, email, full_name, school, anonymous_id, is_seller, profile_completed, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (verification !== 'all') {
    const matchingUserIds = await getUserIdsForVerificationFilter(verification as VerificationStatus);
    if (matchingUserIds.length === 0) {
      return {
        ok: true as const,
        users: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
      };
    }
    query = query.in('id', matchingUserIds);
  }

  let queryBuilder = query;

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    queryBuilder = queryBuilder.or(
      `full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%,anonymous_id.ilike.%${trimmedSearch}%`
    );
  }

  if (school !== 'all' && SCHOOL_OPTIONS.includes(school as (typeof SCHOOL_OPTIONS)[number])) {
    queryBuilder = queryBuilder.eq('school', school);
  }

  if (seller === 'seller') {
    queryBuilder = queryBuilder.eq('is_seller', true);
  } else if (seller === 'non-seller') {
    queryBuilder = queryBuilder.eq('is_seller', false);
  }

  if (joinedFrom) {
    queryBuilder = queryBuilder.gte('created_at', joinedFrom);
  }

  if (joinedTo) {
    queryBuilder = queryBuilder.lte('created_at', joinedTo);
  }

  const from = (page - 1) * pageSize;
  queryBuilder = queryBuilder.range(from, from + pageSize - 1);

  const { data, error, count } = await queryBuilder;
  if (error) {
    return { ok: false as const, error };
  }

  const rows = data || [];
  const userIds = rows.map((row) => row.id);
  const aggregates = await fetchUserAggregates(userIds);

  const users: AdminUserListItem[] = rows.map((row) => {
    const verificationStatus = deriveVerificationStatus({
      isSeller: Boolean(row.is_seller),
      latestVerificationStatus: aggregates.latestVerificationStatus.get(row.id) || null,
      hasPendingReview: aggregates.pendingReviewUserIds.has(row.id),
    });

    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      school: row.school,
      anonymousId: row.anonymous_id,
      isSeller: Boolean(row.is_seller),
      profileCompleted: Boolean(row.profile_completed),
      verificationStatus,
      verifiedCourseCount: aggregates.verifiedCourseCounts.get(row.id) || 0,
      verificationRequestCount: aggregates.verificationCounts.get(row.id) || 0,
      adminReviewCount: aggregates.adminReviewCounts.get(row.id) || 0,
      lastRequestAt: aggregates.lastRequestAt.get(row.id) || null,
      createdAt: row.created_at,
    };
  });

  return {
    ok: true as const,
    users,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
  };
}

export async function getAdminUserDetail(userId: string) {
  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('id, email, full_name, school, anonymous_id, is_seller, profile_completed, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    return { ok: false as const, error: profileError };
  }

  if (!profile) {
    return { ok: false as const, notFound: true as const };
  }

  const [
    authResult,
    verifiedCoursesResult,
    verificationsResult,
    adminReviewsResult,
  ] = await Promise.all([
    adminClient.auth.admin.getUserById(userId),
    adminClient
      .from('verified_courses')
      .select('id, course_code, course_name, grade, semester, academic_year, verified_at')
      .eq('user_id', userId)
      .order('verified_at', { ascending: false }),
    adminClient
      .from('grade_verifications')
      .select(
        'id, status, submission_type, transcript_filename, extraction_confidence, risk_level, risk_score, verification_decision, created_at, reviewed_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    adminClient
      .from('admin_review_requests')
      .select(
        'id, status, issue_type, created_at, resolved_at, reviewed_by, upload_id, reviewer:users!reviewed_by(full_name, email)'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const authUser = authResult.data?.user || null;
  const verifications = verificationsResult.data || [];
  const adminReviews = adminReviewsResult.data || [];
  const verificationIds = verifications.map((row) => row.id);
  const adminReviewIds = adminReviews.map((row) => row.id);

  let timeline: Array<{
    id: string;
    action_type: string;
    from_status: string | null;
    to_status: string | null;
    notes: string | null;
    created_at: string;
    actor?: { full_name: string | null; email: string | null } | null;
  }> = [];

  if (verificationIds.length > 0 || adminReviewIds.length > 0) {
    const filters: string[] = [];
    if (verificationIds.length > 0) {
      filters.push(`verification_id.in.(${verificationIds.join(',')})`);
    }
    if (adminReviewIds.length > 0) {
      filters.push(`review_request_id.in.(${adminReviewIds.join(',')})`);
    }

    const { data: timelineData } = await adminClient
      .from('review_actions')
      .select(
        'id, action_type, from_status, to_status, notes, created_at, verification_id, review_request_id, actor:users!actor_user_id(full_name, email)'
      )
      .or(filters.join(','))
      .order('created_at', { ascending: false })
      .limit(30);

    timeline = (timelineData || []).map((entry) => {
      const actorRaw = entry.actor;
      const actor = Array.isArray(actorRaw) ? actorRaw[0] : actorRaw;
      return {
        id: entry.id,
        action_type: entry.action_type,
        from_status: entry.from_status,
        to_status: entry.to_status,
        notes: entry.notes,
        created_at: entry.created_at,
        actor: actor ?? null,
      };
    });
  }

  const verificationStatus = deriveVerificationStatus({
    isSeller: Boolean(profile.is_seller),
    latestVerificationStatus: verifications[0]?.status || null,
    hasPendingReview: adminReviews.some((review) => review.status === 'pending' || review.status === 'reviewing'),
  });

  const stats = {
    submitted: verifications.length,
    approved: verifications.filter((row) => row.status === 'approved').length,
    rejected: verifications.filter((row) => row.status === 'rejected').length,
    pending: verifications.filter(
      (row) => row.status === 'pending_review' || row.status === 'manual_required'
    ).length,
    adminReviews: adminReviews.length,
  };

  const pendingReview = adminReviews.find((review) => review.status === 'pending' || review.status === 'reviewing');

  const verificationHistory = verifications.map((verification, index) => {
    const linkedReview = adminReviews.find((review) => review.upload_id === verification.id);
    const reviewerRaw = linkedReview?.reviewer;
    const reviewer = Array.isArray(reviewerRaw) ? reviewerRaw[0] : reviewerRaw;

    return {
      id: verification.id,
      requestNumber: verifications.length - index,
      submittedAt: verification.created_at,
      status: verification.status,
      aiConfidence: verification.extraction_confidence,
      riskLevel: verification.risk_level,
      reviewerName: reviewer?.full_name || reviewer?.email || null,
      adminReviewId: linkedReview?.id || null,
      adminReviewStatus: linkedReview?.status || null,
      transcriptFilename: verification.transcript_filename,
    };
  });

  return {
    ok: true as const,
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      school: profile.school,
      anonymousId: profile.anonymous_id,
      isSeller: Boolean(profile.is_seller),
      profileCompleted: Boolean(profile.profile_completed),
      verificationStatus,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      emailVerified: Boolean(authUser?.email_confirmed_at),
      lastLoginAt: authUser?.last_sign_in_at || null,
      verifiedSince: profile.is_seller ? verifications.find((row) => row.status === 'approved')?.reviewed_at || null : null,
      lastTranscriptUploadAt: verifications[0]?.created_at || null,
    },
    stats,
    verifiedCourses: (verifiedCoursesResult.data || []).map((course) => ({
      id: course.id,
      courseCode: course.course_code,
      courseName: course.course_name,
      grade: course.grade,
      semester: course.semester,
      academicYear: course.academic_year,
      verifiedAt: course.verified_at,
      canUploadNotes: Boolean(profile.is_seller),
    })),
    verificationHistory,
    pendingReviewId: pendingReview?.id || null,
    timeline,
  };
}
