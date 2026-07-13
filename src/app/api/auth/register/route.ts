
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { sendVerificationEmail } from '@/lib/email/resend';
import {
  isValidEmail,
  isValidPassword,
} from '@/lib/auth/utils';
import { staffEmailExceptionMessage } from '@/lib/auth/staff-emails';
import {
  replaceVerificationToken,
  resolveUserForVerification,
} from '@/lib/auth/verification';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function registrationResponse(options?: { message?: string; tokenIssuedAt?: string; requiresVerification?: boolean }) {
  return {
    data: {
      success: true,
      message: options?.message || 'If this email is eligible, we sent a verification email.',
      requiresVerification: options?.requiresVerification ?? true,
      ...(options?.tokenIssuedAt ? { tokenIssuedAt: options.tokenIssuedAt } : {}),
    },
  };
}

// Rate limit: 5 registrations per IP/email per hour
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'),
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
    // Rate limiting
    const ip = getClientIp(request);
    const { success } = await ratelimit.limit(`register:${ip}`);

    if (!success) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT', message: 'Too many registration attempts. Try again later.' } },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid email or password format' } },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const isDev = process.env.NODE_ENV !== 'production';

    const { success: emailLimitSuccess } = await ratelimit.limit(`register-email:${normalizedEmail}`);
    if (!emailLimitSuccess) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT', message: 'Too many registration attempts. Try again later.' } },
        { status: 429 }
      );
    }

    // Check University email domain
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_DOMAIN',
            message:
              `Only @ust.hk or @connect.ust.hk email addresses are allowed (except ${staffEmailExceptionMessage()}).`,
          },
        },
        { status: 400 }
      );
    }

    // Check password strength
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' } },
        { status: 400 }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if email already exists
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUserError) {
      console.error('Existing user lookup error:', existingUserError);
      return NextResponse.json(
        { error: { code: 'USER_LOOKUP_ERROR', message: 'Failed to check existing user' } },
        { status: 500 }
      );
    }

    if (existingUser) {
      const resolved = await resolveUserForVerification(supabaseAdmin, normalizedEmail);

      if (resolved && !resolved.isVerified) {
        const tokenResult = await replaceVerificationToken(supabaseAdmin, resolved.userId);

        if (tokenResult) {
          const tokenIssuedAt = new Date().toISOString();
          if (isDev) {
            console.log(
              `\n[DEV] Verification code for ${normalizedEmail}:\n${tokenResult.token}\n`
            );
          }

          const emailResult = await sendVerificationEmail(normalizedEmail, tokenResult.token);
          if (!emailResult.success) {
            console.error('Email send failed:', emailResult.error);
          }

          return NextResponse.json(
            registrationResponse({ tokenIssuedAt }),
            { status: 200 }
          );
        }

        return NextResponse.json(
          { error: { code: 'TOKEN_ERROR', message: 'Failed to create verification token' } },
          { status: 500 }
        );
      }

      return NextResponse.json(
        registrationResponse({
          message: isDev
            ? 'This email is already verified. Log in instead.'
            : undefined,
          requiresVerification: false,
        }),
        { status: 200 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
    });

    if (authError || !authData.user) {
      const isDuplicate =
        authError?.message?.toLowerCase().includes('already') ||
        authError?.status === 422;

      if (isDuplicate) {
        const resolved = await resolveUserForVerification(supabaseAdmin, normalizedEmail);

        if (resolved && !resolved.isVerified) {
          const tokenResult = await replaceVerificationToken(supabaseAdmin, resolved.userId);

          if (tokenResult) {
            const tokenIssuedAt = new Date().toISOString();
            if (isDev) {
              console.log(
                `\n[DEV] Verification code for ${normalizedEmail}:\n${tokenResult.token}\n`
              );
            }

            const emailResult = await sendVerificationEmail(normalizedEmail, tokenResult.token);
            if (!emailResult.success) {
              console.error('Email send failed:', emailResult.error);
            }

            return NextResponse.json(
              registrationResponse({ tokenIssuedAt }),
              { status: 200 }
            );
          }

          return NextResponse.json(
            { error: { code: 'TOKEN_ERROR', message: 'Failed to create verification token' } },
            { status: 500 }
          );
        }

        return NextResponse.json(
          registrationResponse({
            message: isDev
              ? 'This email is already verified. Log in instead.'
              : undefined,
            requiresVerification: false,
          }),
          { status: 200 }
        );
      }

      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: { code: 'AUTH_CREATE_ERROR', message: 'Failed to create auth user' } },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create user record
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: normalizedEmail,
      });

    if (userError) {
      console.error('User record error:', userError);
      return NextResponse.json(
        { error: { code: 'USER_CREATE_ERROR', message: 'Failed to create user profile' } },
        { status: 500 }
      );
    }

    // Generate verification token
    const tokenResult = await replaceVerificationToken(supabaseAdmin, userId);

    if (!tokenResult) {
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { error: { code: 'TOKEN_ERROR', message: 'Failed to create verification token' } },
        { status: 500 }
      );
    }

    const verificationToken = tokenResult.token;
    const tokenIssuedAt = new Date().toISOString();
    // Dev helper: print the real verification code so local testing does not
    // depend on email delivery.
    if (isDev) {
      console.log(
        `\n[DEV] Verification code for ${normalizedEmail}:\n${verificationToken}\n`
      );
    }

    const emailResult = await sendVerificationEmail(normalizedEmail, verificationToken);

    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      // Don't fail registration, user can resend email.
    }

    return NextResponse.json(
      registrationResponse({ tokenIssuedAt }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred during registration' } },
      { status: 500 }
    );
  }
}
