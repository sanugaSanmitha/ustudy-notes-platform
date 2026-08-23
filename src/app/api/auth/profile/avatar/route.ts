import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadUserAvatar } from '@/lib/profile/avatar-storage';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Please choose a photo to upload.' } },
        { status: 400 }
      );
    }

    const avatarUrl = await uploadUserAvatar(user.id, file);

    return NextResponse.json({ data: { avatarUrl } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload profile photo.';
    const isConfig = message.includes('storage') || message.includes('Bucket');
    return NextResponse.json(
      {
        error: {
          code: isConfig ? 'AVATAR_STORAGE_ERROR' : 'AVATAR_UPLOAD_ERROR',
          message,
        },
      },
      { status: isConfig ? 503 : 400 }
    );
  }
}
