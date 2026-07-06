import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { requireReviewerUser } from '@/lib/grades/admin';
import { createReviewAction } from '@/lib/grades/review-pipeline';

const updateSchema = z.object({
  queueId: z.string().uuid(),
  action: z.enum(['assign_to_me', 'unassign', 'mark_under_review']),
});

const OPEN_STATUSES = ['queued_support_fast', 'queued_support_normal', 'queued_manual_fallback', 'pending'];

export const dynamic = 'force-dynamic';

function formatSupportQueueError(error: unknown, fallback: string) {
  const dbError = error as { code?: string; message?: string; details?: string | null; hint?: string | null } | null;
  const combined = `${dbError?.message || ''} ${dbError?.details || ''} ${dbError?.hint || ''}`.toLowerCase();

  if (combined.includes('more than one relationship') || combined.includes('could not embed')) {
    return 'Support queue query failed due to an ambiguous database relationship. Redeploy the latest app code and try again.';
  }

  if (
    combined.includes('does not exist') &&
    (combined.includes('grade_parse_queue') || combined.includes('review_actions') || combined.includes('user_roles'))
  ) {
    return 'Support review tables are missing. Run docs/migrations/011_human_review_pipeline.sql in Supabase SQL Editor.';
  }

  if (combined.includes('permission denied')) {
    return 'Database permissions are missing for support queue tables. Re-run docs/migrations/011_human_review_pipeline.sql.';
  }

  const detail = dbError?.message?.trim();
  return detail ? `${fallback} (${detail})` : fallback;
}

const QUEUE_SELECT =
  'id, verification_id, user_id, status, queue_tier, confidence_score, parser_source, failure_reason, assigned_to, assigned_at, reviewed_at, created_at, updated_at, grade_verifications!verification_id(id, status, transcript_filename, risk_level, risk_score), student:users!user_id(full_name, email)';

export async function GET(request: NextRequest) {
  const auth = await requireReviewerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const url = new URL(request.url);
  const statusFilter = (url.searchParams.get('status') || '').trim();
  const mineOnly = url.searchParams.get('mine') === 'true';

  let query = adminClient
    .from('grade_parse_queue')
    .select(QUEUE_SELECT)
    .order('created_at', { ascending: true })
    .limit(100);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  } else {
    query = query.in('status', OPEN_STATUSES);
  }

  if (mineOnly) {
    query = query.eq('assigned_to', auth.user.id);
  } else if (!auth.roles?.includes('admin')) {
    query = query.or(`assigned_to.is.null,assigned_to.eq.${auth.user.id}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Support queue fetch error:', error);
    const message = formatSupportQueueError(error, 'Failed to fetch support queue.');
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message,
          detail: process.env.NODE_ENV === 'production' ? null : error,
        },
      },
      { status: 500 }
    );
  }

  const queue = (data || []).map((row) => {
    const studentRaw = (row as { student?: unknown; users?: { full_name: string | null; email: string | null } | null }).student;
    const student = Array.isArray(studentRaw) ? studentRaw[0] : studentRaw;
    return {
      ...row,
      users: student || (row as { users?: { full_name: string | null; email: string | null } | null }).users || null,
    };
  });

  return NextResponse.json({ data: { queue } }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const auth = await requireReviewerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
      { status: 400 }
    );
  }

  const { queueId, action } = parsed.data;
  const { data: queueRow, error: queueError } = await adminClient
    .from('grade_parse_queue')
    .select('id, verification_id, status, assigned_to')
    .eq('id', queueId)
    .maybeSingle();

  if (queueError) {
    console.error('Support queue fetch error:', queueError);
    const message = formatSupportQueueError(queueError, 'Failed to load queue item.');
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message } },
      { status: 500 }
    );
  }

  if (!queueRow) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Queue item not found.' } },
      { status: 404 }
    );
  }

  const nextStatus =
    action === 'mark_under_review'
      ? 'under_review'
      : queueRow.status;

  const assignedTo =
    action === 'assign_to_me'
      ? auth.user.id
      : action === 'unassign'
        ? null
        : queueRow.assigned_to;
  const now = new Date().toISOString();
  const assignedAt = action === 'assign_to_me' ? now : action === 'unassign' ? null : undefined;

  const { error: updateError } = await adminClient
    .from('grade_parse_queue')
    .update({
      assigned_to: assignedTo,
      ...(assignedAt !== undefined ? { assigned_at: assignedAt } : {}),
      status: nextStatus,
      updated_at: now,
    })
    .eq('id', queueId);

  if (updateError) {
    console.error('Support queue update error:', updateError);
    const message = formatSupportQueueError(updateError, 'Failed to update queue item.');
    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message } },
      { status: 500 }
    );
  }

  try {
    await createReviewAction({
      verificationId: queueRow.verification_id,
      queueId,
      actorUserId: auth.user.id,
      actorRole: auth.roles?.includes('admin') ? 'admin' : 'support',
      actionType: `queue_${action}`,
      fromStatus: queueRow.status,
      toStatus: nextStatus,
      afterPayload: { assignedTo },
    });
  } catch (logError) {
    console.error('Support queue action log error:', logError);
  }

  return NextResponse.json(
    {
      data: {
        queueId,
        action,
        assignedTo,
        status: nextStatus,
      },
    },
    { status: 200 }
  );
}
