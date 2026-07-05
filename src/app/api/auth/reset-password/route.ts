import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { isValidPassword } from '@/lib/auth/utils';

const resetPasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
  });

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'),
});

function getClientIp(request: NextRequest) {
  return (
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const ip = getClientIp(request);
    const limitKey = `reset-password:${user.id}:${ip}`;
    const { success } = await ratelimit.limit(limitKey);
    if (!success) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT',
            message: 'Too many password reset attempts. Try again in 15 minutes.',
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    if (!isValidPassword(newPassword)) {
      return NextResponse.json(
        { error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' } },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          error: {
            code: 'PASSWORD_UNCHANGED',
            message: 'New password must be different from current password',
          },
        },
        { status: 400 }
      );
    }

    const verifyClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: user.email || '',
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' } },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'PASSWORD_UPDATE_ERROR', message: 'Failed to update password' } },
        { status: 500 }
      );
    }

    // Force re-authentication after a credential change.
    await supabase.auth.signOut();

    return NextResponse.json(
      {
        data: {
          success: true,
          message: 'Password updated successfully. Please log in again.',
          requiresRelogin: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while resetting password',
        },
      },
      { status: 500 }
    );
  }
}
