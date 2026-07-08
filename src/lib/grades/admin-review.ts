import { adminClient } from '@/lib/supabase/admin';
import { expireStaleReviewLocks, isLockExpired } from '@/lib/grades/admin-lock';
import {
  ACTIVE_VERIFICATION_STATUSES,
  sortByPriorityThenCreated,
  type VerificationPriority,
  VERIFICATION_PRIORITIES,
} from '@/lib/grades/verification-workflow';

const MIGRATION_014_HINT =
  'Run docs/migrations/014_admin_review_workflow.sql in Supabase SQL Editor, then redeploy.';
const MIGRATION_020_HINT =
  'Run docs/migrations/020_verification_workflow.sql in Supabase SQL Editor, then redeploy.';

const LIST_VERIFICATION_SELECT =
  'id, status, transcript_filename, transcript_storage_bucket, transcript_storage_path, risk_level, risk_score';

type ReviewRequestRow = {
  id: string;
  status: string;
  reviewed_by: string | null;
  assigned_to: string | null;
  assigned_by?: string | null;
  priority?: string | null;
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

export async function listAdminReviewRequests(
  statusFilter: string,
  options: {
    search?: string;
    risk?: string;
    priority?: string;
    assignedTo?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  await expireStaleReviewLocks();

  const {
    search = '',
    risk = 'all',
    priority = 'all',
    assignedTo,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 25,
  } = options;
  const ascending = statusFilter !== 'approved' && statusFilter !== 'rejected';

  let matchingUserIds: string[] | null = null;
  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    const { data: users } = await adminClient
      .from('users')
      .select('id')
      .or(`full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%`)
      .limit(50);
    matchingUserIds = (users || []).map((u) => u.id);
    if (matchingUserIds.length === 0) {
      return { ok: true as const, requests: [], total: 0, workflowEnabled: true };
    }
  }

  const buildQuery = (select: string, orderByPriority = false) => {
    let query = adminClient.from('admin_review_requests').select(select, { count: 'exact' });

    if (orderByPriority) {
      query = query.order('priority', { ascending: true }).order('created_at', { ascending });
    } else {
      query = query.order('created_at', { ascending });
    }

    if (statusFilter === 'waiting_assignment') {
      query = query.eq('status', 'pending').is('assigned_to', null);
    } else if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (matchingUserIds) {
      query = query.in('user_id', matchingUserIds);
    }

    if (priority !== 'all' && VERIFICATION_PRIORITIES.includes(priority as VerificationPriority)) {
      query = query.eq('priority', priority);
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    return query;
  };

  const modernSelect = `id, issue_type, message, external_transcript_url, status, priority, queue, review_started_at, reviewed_by, assigned_to, assigned_at, assigned_by, assigned_by_user_id, reassignment_requested_by, reassignment_reason, reassignment_requested_at, escalated_at, created_at, updated_at, upload_id, user_id, grade_verifications!upload_id(${LIST_VERIFICATION_SELECT}), student:users!user_id(full_name, email), reviewer:users!reviewed_by(full_name, email), assignee:users!assigned_to(full_name, email)`;
  const legacySelect = `id, issue_type, message, external_transcript_url, status, created_at, updated_at, upload_id, user_id, grade_verifications!upload_id(${LIST_VERIFICATION_SELECT}), users!user_id(full_name, email)`;
  const minimalSelect = `id, issue_type, message, status, created_at, updated_at, upload_id, user_id, users!user_id(full_name, email)`;

  let { data, error, count } = await buildQuery(modernSelect, true);

  if (error) {
    const legacyResult = await buildQuery(legacySelect);
    data = legacyResult.data;
    error = legacyResult.error;
    count = legacyResult.count;
  }

  if (error) {
    const minimalResult = await buildQuery(minimalSelect);
    data = minimalResult.data;
    error = minimalResult.error;
    count = minimalResult.count;
  }

  if (error) {
    return {
      ok: false as const,
      error,
      migrationHint: isWorkflowSchemaError(error) ? MIGRATION_014_HINT : null,
    };
  }

  let requests = (data || []).map((row) => normalizeReviewListRow(row as unknown as Record<string, unknown>));

  if (risk !== 'all') {
    requests = requests.filter((row) => {
      const verification = (row as { grade_verifications?: { risk_level?: string | null } | null }).grade_verifications;
      const level = Array.isArray(verification)
        ? verification[0]?.risk_level
        : verification?.risk_level;
      return (level || '').toLowerCase() === risk.toLowerCase();
    });
  }

  const hasPriorityColumn = Boolean(data?.[0] && 'priority' in (data[0] as object));

  const enriched = (hasPriorityColumn
    ? sortByPriorityThenCreated(requests as unknown as Array<{ priority?: string | null; created_at: string }>)
    : requests
  ).map((row) => {
    const r = row as Record<string, unknown>;
    const status = String(r.status || '');
    const reviewer = r.reviewer as { full_name?: string | null; email?: string | null } | null;
    const assigneeRaw = r.assignee;
    const assignee = Array.isArray(assigneeRaw) ? assigneeRaw[0] : assigneeRaw;
    return {
      ...r,
      assignee: assignee || null,
      isLocked: status === 'reviewing' || status === 'pending_reassignment',
      reviewerInitials: reviewer?.full_name?.slice(0, 2).toUpperCase() || reviewer?.email?.slice(0, 2).toUpperCase() || null,
    };
  });

  return {
    ok: true as const,
    requests: enriched,
    total: risk !== 'all' ? enriched.length : count || enriched.length,
    workflowEnabled: Boolean((data || [])[0] && 'reviewed_by' in ((data || [])[0] as object)),
  };
}

export async function fetchAdminReviewDetail(requestId: string) {
  const modernSelect = `id, issue_type, message, external_transcript_url, status, priority, queue, admin_notes, internal_notes, review_started_at, reviewed_by, assigned_to, assigned_at, assigned_by, reassignment_requested_by, reassignment_reason, reassignment_requested_at, student_info_request, escalated_at, created_at, updated_at, resolved_at, upload_id, user_id, grade_verifications!upload_id(id, status, transcript_filename, parser_source, extraction_confidence, transcript_storage_bucket, transcript_storage_path, parsed_courses, manual_courses, review_rows, parsed_transcript, risk_level, risk_score, risk_reasons, reviewer_note, created_at), student:users!user_id(full_name, email), reviewer:users!reviewed_by(full_name, email), assignee:users!assigned_to(full_name, email)`;
  const legacySelect = `id, issue_type, message, external_transcript_url, status, admin_notes, created_at, updated_at, resolved_at, upload_id, user_id, grade_verifications!upload_id(id, status, transcript_filename, parser_source, extraction_confidence, transcript_storage_bucket, transcript_storage_path, parsed_courses, manual_courses, review_rows, parsed_transcript, risk_level, risk_score, risk_reasons, reviewer_note, created_at), users!user_id(full_name, email)`;
  const minimalSelect = `id, issue_type, message, status, admin_notes, created_at, updated_at, resolved_at, upload_id, user_id, users!user_id(full_name, email)`;

  const { data, error: initialError } = await adminClient.from('admin_review_requests').select(modernSelect).eq('id', requestId).maybeSingle();
  let rowData: Record<string, unknown> | null = (data as Record<string, unknown> | null) ?? null;
  let error = initialError;

  if (error) {
    const legacyResult = await adminClient.from('admin_review_requests').select(legacySelect).eq('id', requestId).maybeSingle();
    rowData = (legacyResult.data as Record<string, unknown> | null) ?? null;
    error = legacyResult.error;
  }

  if (error) {
    const minimalResult = await adminClient.from('admin_review_requests').select(minimalSelect).eq('id', requestId).maybeSingle();
    rowData = (minimalResult.data as Record<string, unknown> | null) ?? null;
    error = minimalResult.error;
  }

  if (error) {
    return {
      ok: false as const,
      error,
      migrationHint: isWorkflowSchemaError(error) ? MIGRATION_014_HINT : null,
    };
  }

  if (!rowData) {
    return { ok: false as const, notFound: true as const };
  }

  return {
    ok: true as const,
    request: normalizeReviewListRow(rowData),
  };
}

export async function getReviewerDisplayName(userId: string | null | undefined) {
  if (!userId) {
    return 'Another admin';
  }

  const { data } = await adminClient.from('users').select('full_name, email').eq('id', userId).maybeSingle();
  return data?.full_name?.trim() || data?.email?.trim() || 'Another admin';
}

export async function claimAdminReviewRequest(
  requestId: string,
  reviewerId: string,
  options: { isAdmin?: boolean } = {}
) {
  const isAdmin = options.isAdmin ?? false;
  await expireStaleReviewLocks();

  let { data: current, error } = await adminClient
    .from('admin_review_requests')
    .select('id, status, reviewed_by, assigned_to, upload_id, user_id, updated_at')
    .eq('id', requestId)
    .maybeSingle();

  if (error && isWorkflowSchemaError(error)) {
    const legacyResult = await adminClient
      .from('admin_review_requests')
      .select('id, status, upload_id, user_id')
      .eq('id', requestId)
      .maybeSingle();
    current = legacyResult.data
      ? { ...legacyResult.data, reviewed_by: null, assigned_to: null, updated_at: null, status: legacyResult.data.status }
      : null;
    error = legacyResult.error;
  }

  if (error) {
    throw error;
  }

  if (!current) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Admin review request not found.' };
  }

  const row = current as ReviewRequestRow & {
    updated_at?: string | null;
    assigned_to?: string | null;
    assigned_by?: string | null;
    assigned_by_user_id?: string | null;
    assigned_at?: string | null;
  };

  if (
    !isAdmin &&
    row.status === 'pending' &&
    row.assigned_to &&
    row.assigned_to !== reviewerId
  ) {
    const assigneeName = await getReviewerDisplayName(row.assigned_to);
    return {
      ok: true as const,
      claimed: false as const,
      request: row,
      readOnly: true as const,
      lockedBy: row.assigned_to,
      reviewerName: assigneeName,
    };
  }

  if (row.status === 'approved' || row.status === 'rejected') {
    return { ok: true as const, claimed: false as const, request: row, readOnly: true as const };
  }

  if (
    row.status === 'reviewing' &&
    row.reviewed_by &&
    row.reviewed_by !== reviewerId &&
    !isLockExpired(row.updated_at)
  ) {
    const reviewerName = await getReviewerDisplayName(row.reviewed_by);
    return {
      ok: true as const,
      claimed: false as const,
      request: row,
      readOnly: true as const,
      lockedBy: row.reviewed_by,
      reviewerName,
    };
  }

  if (row.status === 'reviewing' && row.reviewed_by === reviewerId) {
    const now = new Date().toISOString();
    await adminClient.from('admin_review_requests').update({ updated_at: now }).eq('id', requestId);
    return { ok: true as const, claimed: false as const, request: row, readOnly: false as const };
  }

  if (row.status === 'pending' || (row.status === 'reviewing' && isLockExpired(row.updated_at))) {
    const now = new Date().toISOString();
    let claimQuery = adminClient
      .from('admin_review_requests')
      .update({
        status: 'reviewing',
        reviewed_by: reviewerId,
        assigned_to: row.assigned_to || reviewerId,
        assigned_by: row.assigned_to ? row.assigned_by || 'admin' : 'self_claim',
        assigned_by_user_id: row.assigned_to ? row.assigned_by_user_id || null : reviewerId,
        assigned_at: row.assigned_at || now,
        review_started_at: now,
        updated_at: now,
      })
      .eq('id', requestId)
      .in('status', ['pending', 'reviewing']);

    if (!isAdmin) {
      claimQuery = claimQuery.or(`assigned_to.is.null,assigned_to.eq.${reviewerId}`);
    }

    const { data: claimed, error: claimError } = await claimQuery
      .select('id, status, reviewed_by, assigned_to, upload_id, user_id')
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
        .select('id, status, reviewed_by, assigned_to, upload_id, user_id')
        .eq('id', requestId)
        .maybeSingle();

      const refreshedRow = refreshed as (ReviewRequestRow & { assigned_to?: string | null }) | null;
      if (refreshedRow?.assigned_to && refreshedRow.assigned_to !== reviewerId && !isAdmin) {
        const assigneeName = await getReviewerDisplayName(refreshedRow.assigned_to);
        return {
          ok: true as const,
          claimed: false as const,
          request: refreshedRow,
          readOnly: true as const,
          lockedBy: refreshedRow.assigned_to,
          reviewerName: assigneeName,
          code: 'ALREADY_CLAIMED' as const,
        };
      }
      if (
        refreshedRow?.status === 'reviewing' &&
        refreshedRow.reviewed_by &&
        refreshedRow.reviewed_by !== reviewerId
      ) {
        const reviewerName = await getReviewerDisplayName(refreshedRow.reviewed_by);
        return {
          ok: true as const,
          claimed: false as const,
          request: refreshedRow,
          readOnly: true as const,
          lockedBy: refreshedRow.reviewed_by,
          reviewerName,
          code: 'ALREADY_CLAIMED' as const,
        };
      }
    } else {
      return { ok: true as const, claimed: true as const, request: claimed as ReviewRequestRow, readOnly: false as const };
    }
  }

  return { ok: true as const, claimed: false as const, request: row, readOnly: false as const };
}

export async function assignAdminReviewRequest(
  requestId: string,
  assigneeUserId: string | null,
  options: { adminUserId: string; startReview?: boolean }
) {
  const { data: current, error: fetchError } = await adminClient
    .from('admin_review_requests')
    .select('id, status, assigned_to, reviewed_by, upload_id')
    .eq('id', requestId)
    .maybeSingle();

  if (fetchError) {
    if (isWorkflowSchemaError(fetchError)) {
      return { ok: false as const, code: 'SCHEMA' as const, message: MIGRATION_020_HINT };
    }
    throw fetchError;
  }

  if (!current) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Review request not found.' };
  }

  if (current.status === 'approved' || current.status === 'rejected') {
    return { ok: false as const, code: 'INVALID_STATE' as const, message: 'Finalized requests cannot be reassigned.' };
  }

  const now = new Date().toISOString();
  const startReview = options.startReview ?? Boolean(assigneeUserId);
  const previousAssignee = current.assigned_to;
  const previousReviewer = current.reviewed_by;

  const updatePayload: Record<string, unknown> = {
    assigned_to: assigneeUserId,
    assigned_at: assigneeUserId ? now : null,
    assigned_by: assigneeUserId ? 'admin' : null,
    assigned_by_user_id: assigneeUserId ? options.adminUserId : null,
    updated_at: now,
    reassignment_requested_by: null,
    reassignment_reason: null,
    reassignment_requested_at: null,
  };

  if (startReview && assigneeUserId) {
    updatePayload.status = 'reviewing';
    updatePayload.reviewed_by = assigneeUserId;
    updatePayload.review_started_at = now;
  } else if (!assigneeUserId) {
    updatePayload.status = 'pending';
    updatePayload.reviewed_by = null;
    updatePayload.review_started_at = null;
  }

  const { data, error } = await adminClient
    .from('admin_review_requests')
    .update(updatePayload)
    .eq('id', requestId)
    .select('id, status, assigned_to, assigned_at, reviewed_by')
    .maybeSingle();

  if (error) {
    if (isWorkflowSchemaError(error)) {
      return { ok: false as const, code: 'SCHEMA' as const, message: MIGRATION_020_HINT };
    }
    throw error;
  }

  if (!data) {
    return { ok: false as const, code: 'INVALID_STATE' as const, message: 'Request could not be updated.' };
  }

  return {
    ok: true as const,
    request: data,
    previousAssignee,
    previousReviewer,
    actionType: previousAssignee || previousReviewer ? 'review_reassigned' : assigneeUserId ? 'review_assigned' : 'review_unassigned',
  };
}

export async function changeVerificationPriority(requestId: string, priority: VerificationPriority) {
  if (!VERIFICATION_PRIORITIES.includes(priority)) {
    return { ok: false as const, code: 'INVALID_INPUT' as const, message: 'Invalid priority level.' };
  }

  const { data, error } = await adminClient
    .from('admin_review_requests')
    .update({ priority, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .in('status', ACTIVE_VERIFICATION_STATUSES)
    .select('id, priority, status')
    .maybeSingle();

  if (error) {
    if (isWorkflowSchemaError(error)) {
      return { ok: false as const, code: 'SCHEMA' as const, message: MIGRATION_020_HINT };
    }
    throw error;
  }

  if (!data) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Active review request not found.' };
  }

  return { ok: true as const, request: data };
}

export async function escalateVerificationRequest(requestId: string) {
  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from('admin_review_requests')
    .update({
      status: 'escalated',
      priority: 'urgent',
      escalated_at: now,
      updated_at: now,
    })
    .eq('id', requestId)
    .in('status', ACTIVE_VERIFICATION_STATUSES)
    .select('id, status, priority')
    .maybeSingle();

  if (error) {
    if (isWorkflowSchemaError(error)) {
      return { ok: false as const, code: 'SCHEMA' as const, message: MIGRATION_020_HINT };
    }
    throw error;
  }

  if (!data) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Active review request not found.' };
  }

  return { ok: true as const, request: data };
}

export async function requestStudentInformation(
  requestId: string,
  actorId: string,
  message: string
) {
  const { data: current } = await adminClient
    .from('admin_review_requests')
    .select('id, status, reviewed_by, assigned_to, upload_id')
    .eq('id', requestId)
    .maybeSingle();

  if (!current) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Review request not found.' };
  }

  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from('admin_review_requests')
    .update({
      status: 'waiting_student',
      student_info_request: message,
      updated_at: now,
    })
    .eq('id', requestId)
    .eq('reviewed_by', actorId)
    .in('status', ['reviewing', 'escalated'])
    .select('id, status, upload_id')
    .maybeSingle();

  if (error) {
    if (isWorkflowSchemaError(error)) {
      return { ok: false as const, code: 'SCHEMA' as const, message: MIGRATION_020_HINT };
    }
    throw error;
  }

  if (!data) {
    return { ok: false as const, code: 'LOCKED' as const, message: 'You must own this review to request information.' };
  }

  return { ok: true as const, request: data, previousStatus: current.status };
}

export async function resumeReviewAfterStudentReply(requestId: string) {
  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from('admin_review_requests')
    .update({
      status: 'reviewing',
      student_info_request: null,
      updated_at: now,
    })
    .eq('id', requestId)
    .eq('status', 'waiting_student')
    .select('id, status, reviewed_by, assigned_to')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? { ok: true as const, request: data } : { ok: false as const, code: 'INVALID_STATE' as const };
}

export async function requestVerificationReassignment(
  requestId: string,
  actorId: string,
  reason: string
) {
  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from('admin_review_requests')
    .update({
      status: 'pending_reassignment',
      reassignment_requested_by: actorId,
      reassignment_reason: reason,
      reassignment_requested_at: now,
      updated_at: now,
    })
    .eq('id', requestId)
    .eq('reviewed_by', actorId)
    .in('status', ['reviewing', 'escalated'])
    .select('id, status, reviewed_by, assigned_to, upload_id')
    .maybeSingle();

  if (error) {
    if (isWorkflowSchemaError(error)) {
      return { ok: false as const, code: 'SCHEMA' as const, message: MIGRATION_020_HINT };
    }
    throw error;
  }

  if (!data) {
    return { ok: false as const, code: 'LOCKED' as const, message: 'You must own this review to request reassignment.' };
  }

  return { ok: true as const, request: data };
}

export async function resolveVerificationReassignment(
  requestId: string,
  options: {
    decision: 'approve' | 'reject';
    newAssigneeUserId?: string | null;
    adminUserId: string;
  }
) {
  const { data: current, error: fetchError } = await adminClient
    .from('admin_review_requests')
    .select('id, status, reviewed_by, assigned_to, upload_id')
    .eq('id', requestId)
    .eq('status', 'pending_reassignment')
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!current) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'No pending reassignment request found.' };
  }

  if (options.decision === 'reject') {
    const now = new Date().toISOString();
    const { data, error } = await adminClient
      .from('admin_review_requests')
      .update({
        status: 'reviewing',
        reassignment_requested_by: null,
        reassignment_reason: null,
        reassignment_requested_at: null,
        updated_at: now,
      })
      .eq('id', requestId)
      .select('id, status, reviewed_by')
      .maybeSingle();

    if (error) throw error;
    return { ok: true as const, request: data, decision: 'reject' as const, previousAssignee: current.assigned_to };
  }

  return assignAdminReviewRequest(requestId, options.newAssigneeUserId ?? null, {
    adminUserId: options.adminUserId,
    startReview: Boolean(options.newAssigneeUserId),
  }).then((result) =>
    result.ok
      ? { ...result, decision: 'approve' as const, previousAssignee: current.assigned_to }
      : result
  );
}

export async function adminTakeVerificationRequest(requestId: string, adminUserId: string) {
  return assignAdminReviewRequest(requestId, adminUserId, {
    adminUserId,
    startReview: true,
  });
}

export async function fetchAdminReviewStats() {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const dayStart = startOfDay.toISOString();

  const [
    pendingResult,
    waitingAssignmentResult,
    reviewingResult,
    waitingStudentResult,
    pendingReassignmentResult,
    escalatedResult,
    approvedTodayResult,
    rejectedTodayResult,
  ] = await Promise.all([
    adminClient.from('admin_review_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    adminClient
      .from('admin_review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .is('assigned_to', null),
    adminClient.from('admin_review_requests').select('id', { count: 'exact', head: true }).eq('status', 'reviewing'),
    adminClient.from('admin_review_requests').select('id', { count: 'exact', head: true }).eq('status', 'waiting_student'),
    adminClient
      .from('admin_review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_reassignment'),
    adminClient.from('admin_review_requests').select('id', { count: 'exact', head: true }).eq('status', 'escalated'),
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
    waitingAssignment: waitingAssignmentResult.count || 0,
    reviewing: reviewingResult.count || 0,
    waitingStudent: waitingStudentResult.count || 0,
    pendingReassignment: pendingReassignmentResult.count || 0,
    escalated: escalatedResult.count || 0,
    approvedToday: approvedTodayResult.count || 0,
    rejectedToday: rejectedTodayResult.count || 0,
  };
}
