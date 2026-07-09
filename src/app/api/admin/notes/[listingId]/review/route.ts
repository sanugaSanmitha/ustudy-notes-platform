import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminUser } from '@/lib/grades/admin';
import { applyRateLimitResponse, requireAdminCsrf } from '@/lib/api/admin-guard';
import { reviewAdminNoteListing } from '@/lib/notes/admin-notes';
import { revalidateMarketplaceCaches } from '@/lib/notes/revalidate-marketplace';
import { NOTE_REJECT_REASON_OPTIONS, noteRejectReasonLabel, type NoteRejectReason } from '@/lib/notes/reject-reasons';
import { sendNoteListingApprovedEmail, sendNoteListingRejectedEmail } from '@/lib/email/resend';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const reviewSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    adminNotes: z.string().trim().max(1000).optional(),
    rejectReason: z.enum(NOTE_REJECT_REASON_OPTIONS.map((option) => option.value) as [NoteRejectReason, ...NoteRejectReason[]]).optional(),
    rejectComment: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'reject') {
      if (!value.rejectReason) {
        ctx.addIssue({ code: 'custom', message: 'Reject reason is required.', path: ['rejectReason'] });
      }
      if (!value.rejectComment || value.rejectComment.length < 10) {
        ctx.addIssue({
          code: 'custom',
          message: 'Reject comment must be at least 10 characters.',
          path: ['rejectComment'],
        });
      }
    }
  });

type RouteContext = { params: { listingId: string } };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const csrfError = requireAdminCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const rateLimitError = applyRateLimitResponse(auth.user.id);
  if (rateLimitError) {
    return rateLimitError;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid JSON body.' } }, { status: 400 });
  }

  const parsedBody = reviewSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsedBody.error.issues[0]?.message || 'Invalid review payload.' } },
      { status: 400 }
    );
  }

  const { action, adminNotes, rejectReason, rejectComment } = parsedBody.data;

  const result = await reviewAdminNoteListing({
    listingId: params.listingId,
    reviewerId: auth.user.id,
    action,
    adminNotes,
    rejectReason,
    rejectComment,
  });

  if (!result.ok) {
    if ('code' in result && result.code === 'ALREADY_REVIEWED') {
      return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: 409 });
    }

    if ('notFound' in result && result.notFound) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Note listing not found.' } }, { status: 404 });
    }

    console.error('Admin note listing review error:', result.error);
    const migrationHint = 'missingMigration' in result ? result.missingMigration : null;
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_ERROR',
          message: migrationHint
            ? `Failed to review note listing. Run docs/migrations/${migrationHint} in Supabase SQL Editor.`
            : 'Failed to review note listing.',
        },
      },
      { status: 500 }
    );
  }

  const sellerEmail = result.listing.userEmail;
  const sellerName = result.listing.userName || 'Seller';

  if (sellerEmail) {
    if (action === 'approve') {
      void sendNoteListingApprovedEmail({
        sellerEmail,
        sellerName,
        listingTitle: result.listing.title,
        courseCode: result.listing.courseCode,
        adminNotes: adminNotes || null,
      });
    } else {
      void sendNoteListingRejectedEmail({
        sellerEmail,
        sellerName,
        listingTitle: result.listing.title,
        courseCode: result.listing.courseCode,
        rejectReasonLabel: noteRejectReasonLabel(rejectReason),
        rejectComment: rejectComment || null,
      });
    }
  } else {
    const { data: seller } = await adminClient
      .from('users')
      .select('email, full_name')
      .eq('id', result.listing.userId)
      .maybeSingle();

    if (seller?.email) {
      if (action === 'approve') {
        void sendNoteListingApprovedEmail({
          sellerEmail: seller.email,
          sellerName: seller.full_name || 'Seller',
          listingTitle: result.listing.title,
          courseCode: result.listing.courseCode,
          adminNotes: adminNotes || null,
        });
      } else {
        void sendNoteListingRejectedEmail({
          sellerEmail: seller.email,
          sellerName: seller.full_name || 'Seller',
          listingTitle: result.listing.title,
          courseCode: result.listing.courseCode,
          rejectReasonLabel: noteRejectReasonLabel(rejectReason),
          rejectComment: rejectComment || null,
        });
      }
    }
  }

  if (action === 'approve') {
    revalidateMarketplaceCaches(result.listing.courseCode, result.updated.id);
  } else {
    revalidateMarketplaceCaches(undefined, result.updated.id);
  }

  return NextResponse.json(
    {
      data: {
        listingId: result.updated.id,
        status: result.updated.status,
        nextPendingId: result.nextPendingId,
      },
    },
    { status: 200 }
  );
}
