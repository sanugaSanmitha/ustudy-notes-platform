import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { isValidEmail } from '@/lib/auth/utils';
import { sendPasswordResetEmail } from '@/lib/email/resend';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const schema = z.object({
  email: z.string().email(),
});

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'),
});

function getClientIp(request: NextRequest) {
  return (
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}

function genericSuccessResponse() {
  return NextResponse.json(
    {
      data: {
        success: true,
        message: 'If this email is registered, a password reset link has been sent. Please check your inbox.',
      },
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid email' } },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const isDev = process.env.NODE_ENV !== 'production';

    if (!isValidEmail(email)) {
      return genericSuccessResponse();
    }

    const ip = getClientIp(request);
    const { success } = await ratelimit.limit(`forgot-password:${email}:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT', message: 'Too many reset requests. Try again later.' } },
        { status: 429 }
      );
    }

    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('Forgot password profile lookup error:', profileError);
      return NextResponse.json(
        { error: { code: 'PROFILE_LOOKUP_ERROR', message: 'Failed to process request' } },
        { status: 500 }
      );
    }

    if (!profile?.id) {
      return NextResponse.json(
        {
          error: {
            code: 'EMAIL_NOT_REGISTERED',
            message: 'This email is not registered in the system.',
          },
        },
        { status: 404 }
      );
    }

    const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(profile.id);

    if (authUserError || !authUserData.user?.email_confirmed_at) {
      if (authUserError) {
        console.error('Forgot password auth user lookup error:', authUserError);
      }
      return NextResponse.json(
        {
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email before resetting your password.',
          },
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectTo = `${appUrl}/update-password`;

    const { data: linkData, error: generateLinkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo,
      },
    });

    if (generateLinkError) {
      console.error('Forgot password generate link error:', generateLinkError);
      return NextResponse.json(
        { error: { code: 'TOKEN_ERROR', message: 'Failed to generate password reset link' } },
        { status: 500 }
      );
    }

    const resetUrl = linkData?.properties?.action_link;

    if (!resetUrl) {
      return NextResponse.json(
        { error: { code: 'TOKEN_ERROR', message: 'Failed to generate password reset link' } },
        { status: 500 }
      );
    }

    if (isDev) {
      console.log(`\n[DEV] Password reset link for ${email}:\n${resetUrl}\n`);
    }

    const emailResult = await sendPasswordResetEmail(email, resetUrl);
    if (!emailResult.success) {
      console.error('Password reset email send failed:', emailResult.error);

      if (isDev) {
        return NextResponse.json(
          {
            data: {
              success: true,
              message:
                'Password reset token created. Email delivery failed in dev. Use the reset link printed in the server console.',
            },
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: { code: 'EMAIL_SEND_ERROR', message: 'Failed to send password reset email' } },
        { status: 500 }
      );
    }

    return genericSuccessResponse();
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
