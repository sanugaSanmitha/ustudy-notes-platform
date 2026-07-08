import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminUser } from '@/lib/grades/admin';
import { assignAdminReviewRequest } from '@/lib/grades/admin-review';
import { createReviewAction } from '@/lib/grades/review-pipeline';
import { applyRateLimitResponse, requireAdminCsrf } from '@/lib/api/admin-guard';

const assignSchema = z.object({
  assigneeUserId: z.string().uuid().nullable(),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { requestId: string } }) {
  const csrfError = requireAdminCsrf(request);
  if (csrfError) return csrfError;

  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const rateError = applyRateLimitResponse(auth.user.id);
  if (rateError) return rateError;

  const parsed = assignSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
      { status: 400 }
    );
  }

  const result = await assignAdminReviewRequest(params.requestId, parsed.data.assigneeUserId, {
    adminUserId: auth.user.id,
    startReview: Boolean(parsed.data.assigneeUserId),
  });
  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'SCHEMA' ? 500 : 409;
    return NextResponse.json({ error: { code: result.code, message: result.message } }, { status });
  }

  try {
    await createReviewAction({
      reviewRequestId: params.requestId,
      actorUserId: auth.user.id,
      actorRole: 'admin',
      actionType: result.actionType,
      fromStatus: 'pending',
      toStatus: parsed.data.assigneeUserId ? 'reviewing' : 'pending',
      notes: parsed.data.assigneeUserId || null,
      beforePayload: { previousAssignee: result.previousAssignee },
      afterPayload: { assigneeUserId: parsed.data.assigneeUserId },
    });
  } catch (logError) {
    console.error('Assign review audit error:', logError);
  }

  return NextResponse.json({ data: result.request }, { status: 200 });
}
