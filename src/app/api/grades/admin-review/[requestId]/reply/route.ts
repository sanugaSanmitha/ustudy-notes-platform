import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { submitStudentReviewReply } from '@/lib/grades/student-reply';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const message = String(formData.get('message') || '');
    const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File);

    const result = await submitStudentReviewReply({
      reviewRequestId: params.requestId,
      userId: user.id,
      message,
      files,
    });

    if (!result.ok) {
      const status =
        result.code === 'NOT_FOUND' ? 404 : result.code === 'INVALID_STATE' ? 409 : result.code === 'SCHEMA' ? 500 : 400;
      return NextResponse.json({ error: { code: result.code, message: result.message } }, { status });
    }

    return NextResponse.json(
      {
        data: {
          replyId: result.reply.id,
          message: 'Reply submitted successfully. Your reviewer has been notified and will continue the review.',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Student review reply error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit reply.' } },
      { status: 500 }
    );
  }
}
