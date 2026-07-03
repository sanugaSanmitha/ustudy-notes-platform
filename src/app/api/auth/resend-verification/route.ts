import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { sendVerificationEmail } from '@/lib/email/resend';
import { isValidEmail } from '@/lib/auth/utils';
import {
  replaceVerificationToken,
  resolveUserForVerification,
} from '@/lib/auth/verification';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const schema = z.object({
  email: z.string().email(),
});

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 d'),
});

function resendResponse(message?: string, options?: { tokenIssuedAt?: string }) {
  return {
    data: {
      success: true,
      message: message || 'If this email is eligible, we sent a verification email.',
      ...(options?.tokenIssuedAt ? { tokenIssuedAt: options.tokenIssuedAt } : {}),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid email' } },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const isDev = process.env.NODE_ENV !== 'production';

    if (!isValidEmail(email)) {
      return NextResponse.json(resendResponse(), { status: 200 });
    }

    const { success } = await ratelimit.limit(`resend:${email}`);
    if (!success) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT', message: 'Too many resend attempts. Try again tomorrow.' } },
        { status: 429 }
      );
    }

    const resolved = await resolveUserForVerification(adminClient, email);

    if (!resolved) {
      if (isDev) {
        console.log(`[DEV] Resend skipped: no auth/public user found for ${email}`);
      }
      return NextResponse.json(
        resendResponse(isDev ? 'No account was found for that email in development.' : undefined),
        { status: 200 }
      );
    }

    if (resolved.isVerified) {
      if (isDev) {
        console.log(`[DEV] Resend skipped: ${email} is already verified`);
      }
      return NextResponse.json(
        resendResponse(isDev ? 'This email is already verified. Log in instead.' : undefined),
        { status: 200 }
      );
    }

    const tokenResult = await replaceVerificationToken(adminClient, resolved.userId);

    if (!tokenResult) {
      return NextResponse.json(
        { error: { code: 'TOKEN_ERROR', message: 'Failed to create verification token' } },
        { status: 500 }
      );
    }

    const tokenIssuedAt = new Date().toISOString();
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${tokenResult.token}`;

    if (isDev) {
      console.log(
        `\n[DEV] Verification link for ${email}:\n${verificationUrl}\n`
      );
    }

    const emailResult = await sendVerificationEmail(email, tokenResult.token);

    if (!emailResult.success) {
      console.error('Verification email resend failed:', emailResult.error);

      if (isDev) {
        return NextResponse.json(
          resendResponse(
            'Verification token created. Email delivery failed in dev. Use the verification link printed in the server console.',
            { tokenIssuedAt }
          ),
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: { code: 'EMAIL_SEND_ERROR', message: 'Failed to send verification email' } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      resendResponse(undefined, { tokenIssuedAt }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
