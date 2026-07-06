import { adminClient } from '@/lib/supabase/admin';

const MIGRATION_014_HINT =
  'Run docs/migrations/014_admin_review_workflow.sql in Supabase SQL Editor, then redeploy.';

const LIST_VERIFICATION_SELECT =
  'id, status, transcript_filename, transcript_storage_bucket, transcript_storage_path, risk_level, risk_score';

type ReviewRequestRow = {
  id: string;
  status: string;
  reviewed_by: string | null;
  upload_id: string;
  user_id: string;
};

function isWorkflowSchemaError(error: { message?: string; details?: string | null; hint?: string | null } | null) {
  const combined = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return (
    combined.includes('review_started_at') ||
    combined.includes('reviewed_by') ||
    combined.includes('external_transcript_url') ||
    combined.includes('more than one relationship') ||
    combined.includes('could not find a relationship') ||
    combined.includes('could not embed') ||
    combined.includes('schema cache') ||
    combined.includes('column') ||
    combined.includes('does not exist')
  );
}

function normalizeReviewListRow(row: Record<string, unknown>) {
  const student = (row.student as { full_name: string | null; email: string | null } | null) || null;
  const legacyUsers = (row.users as { full_name: string | null; email: string | null } | null) || null;
  return {
    ...row,
    users: student || legacyUsers,
  };
}

export async function listAdminReviewRequests(statusFilter: string) {
  const ascending = statusFilter !== 'approved' && statusFilter !== 'rejected';

  const buildQuery = (select: string) => {
    let query = adminClient
      .from('admin_review_requests')
      .select(select)
      .order('created_at', { ascending })
      .limit(100);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    return query;
  };

  const modernSelect = `id, issue_type, message, external_transcript_url, status, review_started_at, reviewed_by, created_at, updated_at, upload_id, user_id, grade_verifications!upload_id(${LIST_VERIFICATION_SELECT}), student:users!user_id(full_name, email), reviewer:users!reviewed_by(full_name, email)`;
  const legacySelect = `id, issue_type, message, external_transcript_url, status, created_at, updated_at, upload_id, user_id, grade_verifications!upload_id(${LIST_VERIFICATION_SELECT}), users!user_id(full_name, email)`;
  const minimalSelect = `id, issue_type, message, status, created_at, updated_at, upload_id, user_id, users!user_id(full_name, email)`;

  let { data, error } = await buildQuery(modernSelect);

  if (error) {
    const legacyResult = await buildQuery(legacySelect);
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    const minimalResult = await buildQuery(minimalSelect);
    data = minimalResult.data;
    error = minimalResult.error;
  }

  if (error) {
    return {
      ok: false as const,
      error,
      migrationHint: isWorkflowSchemaError(error) ? MIGRATION_014_HINT : null,
    };
  }

  return {
    ok: true as const,
    requests: (data || []).map((row) => normalizeReviewListRow(row as Record<string, unknown>)),
    workflowEnabled: Boolean((data || [])[0] && 'reviewed_by' in ((data || [])[0] as object)),
  };
}

export async function fetchAdminReviewDetail(requestId: string) {
  const modernSelect = `id, issue_type, message, external_transcript_url, status, admin_notes, review_started_at, reviewed_by, created_at, updated_at, resolved_at, upload_id, user_id, grade_verifications!upload_id(id, status, transcript_filename, parser_source, extraction_confidence, transcript_storage_bucket, transcript_storage_path, parsed_courses, manual_courses, review_rows, parsed_transcript, risk_level, risk_score, risk_reasons, reviewer_note, created_at), student:users!user_id(full_name, email), reviewer:users!reviewed_by(full_name, email)`;
  const legacySelect = `id, issue_type, message, external_transcript_url, status, admin_notes, created_at, updated_at, resolved_at, upload_id, user_id, grade_verifications!upload_id(id, status, transcript_filename, parser_source, extraction_confidence, transcript_storage_bucket, transcript_storage_path, parsed_courses, manual_courses, review_rows, parsed_transcript, risk_level, risk_score, risk_reasons, reviewer_note, created_at), users!user_id(full_name, email)`;
  const minimalSelect = `id, issue_type, message, status, admin_notes, created_at, updated_at, resolved_at, upload_id, user_id, users!user_id(full_name, email)`;

  let { data, error } = await adminClient.from('admin_review_requests').select(modernSelect).eq('id', requestId).maybeSingle();

  if (error) {
    const legacyResult = await adminClient.from('admin_review_requests').select(legacySelect).eq('id', requestId).maybeSingle();
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    const minimalResult = await adminClient.from('admin_review_requests').select(minimalSelect).eq('id', requestId).maybeSingle();
    data = minimalResult.data;
    error = minimalResult.error;
  }

  if (error) {
    return {
      ok: false as const,
      error,
      migrationHint: isWorkflowSchemaError(error) ? MIGRATION_014_HINT : null,
    };
  }

  if (!data) {
    return { ok: false as const, notFound: true as const };
  }

  return {
    ok: true as const,
    request: normalizeReviewListRow(data as Record<string, unknown>),
  };
}

export async function getReviewerDisplayName(userId: string | null | undefined) {
  if (!userId) {
    return 'Another admin';
  }

  const { data } = await adminClient.from('users').select('full_name, email').eq('id', userId).maybeSingle();
  return data?.full_name?.trim() || data?.email?.trim() || 'Another admin';
}

export async function claimAdminReviewRequest(requestId: string, adminId: string) {
  let { data: current, error } = await adminClient
    .from('admin_review_requests')
    .select('id, status, reviewed_by, upload_id, user_id')
    .eq('id', requestId)
    .maybeSingle();

  if (error && isWorkflowSchemaError(error)) {
    const legacyResult = await adminClient
      .from('admin_review_requests')
      .select('id, status, upload_id, user_id')
      .eq('id', requestId)
      .maybeSingle();
    current = legacyResult.data
      ? { ...legacyResult.data, reviewed_by: null, status: legacyResult.data.status }
      : null;
    error = legacyResult.error;
  }

  if (error) {
    throw error;
  }

  if (!current) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Admin review request not found.' };
  }

  const row = current as ReviewRequestRow;

  if (row.status === 'approved' || row.status === 'rejected') {
    return { ok: true as const, claimed: false as const, request: row, readOnly: true as const };
  }

  if (row.status === 'reviewing' && row.reviewed_by && row.reviewed_by !== adminId) {
    const reviewerName = await getReviewerDisplayName(row.reviewed_by);
    return {
      ok: false as const,
      code: 'LOCKED' as const,
      message: `Already being reviewed by ${reviewerName}.`,
      reviewerName,
    };
  }

  if (row.status === 'pending') {
    const now = new Date().toISOString();
    const { data: claimed, error: claimError } = await adminClient
      .from('admin_review_requests')
      .update({
        status: 'reviewing',
        reviewed_by: adminId,
        review_started_at: now,
        updated_at: now,
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id, status, reviewed_by, upload_id, user_id')
      .maybeSingle();

    if (claimError) {
      if (isWorkflowSchemaError(claimError)) {
        return { ok: true as const, claimed: false as const, request: row, readOnly: false as const };
      }
      throw claimError;
    }

    if (!claimed) {
      const { data: refreshed } = await adminClient
        .from('admin_review_requests')
        .select('id, status, reviewed_by, upload_id, user_id')
        .eq('id', requestId)
        .maybeSingle();

      const refreshedRow = refreshed as ReviewRequestRow | null;
      if (
        refreshedRow?.status === 'reviewing' &&
        refreshedRow.reviewed_by &&
        refreshedRow.reviewed_by !== adminId
      ) {
        const reviewerName = await getReviewerDisplayName(refreshedRow.reviewed_by);
        return {
          ok: false as const,
          code: 'LOCKED' as const,
          message: `Already being reviewed by ${reviewerName}.`,
          reviewerName,
        };
      }
    } else {
      return { ok: true as const, claimed: true as const, request: claimed as ReviewRequestRow, readOnly: false as const };
    }
  }

  return { ok: true as const, claimed: false as const, request: row, readOnly: false as const };
}

export async function fetchAdminReviewStats() {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const dayStart = startOfDay.toISOString();

  const [pendingResult, reviewingResult, approvedTodayResult, rejectedTodayResult] = await Promise.all([
    adminClient.from('admin_review_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    adminClient.from('admin_review_requests').select('id', { count: 'exact', head: true }).eq('status', 'reviewing'),
    adminClient
      .from('admin_review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('resolved_at', dayStart),
    adminClient
      .from('admin_review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .gte('resolved_at', dayStart),
  ]);

  return {
    pending: pendingResult.count || 0,
    reviewing: reviewingResult.count || 0,
    approvedToday: approvedTodayResult.count || 0,
    rejectedToday: rejectedTodayResult.count || 0,
  };
}
