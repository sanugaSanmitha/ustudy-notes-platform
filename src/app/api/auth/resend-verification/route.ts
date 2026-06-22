
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { sendVerificationEmail } from '@/lib/email/resend';
import { generateVerificationToken } from '@/lib/auth/utils';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const schema = z.object({
  email: z.string().email(),
});

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 d'),
});

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

    const { email } = parsed.data;

    // Rate limit per user
    const { success } = await ratelimit.limit(`resend:${email}`);
    if (!success) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT', message: 'Too many resend attempts. Try again tomorrow.' } },
        { status: 429 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Check if already verified
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
    if (authUser?.user?.email_confirmed_at) {
      return NextResponse.json(
        { error: { code: 'ALREADY_VERIFIED', message: 'This email is already verified' } },
        { status: 400 }
      );
    }

    // Generate new token
    const newToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Delete old tokens
    await supabaseAdmin
      .from('verification_tokens')
      .delete()
      .eq('user_id', user.id)
      .is('used_at', null);

    // Create new token
    const { error: tokenError } = await supabaseAdmin
      .from('verification_tokens')
      .insert({
        user_id: user.id,
        token: newToken,
        expires_at: expiresAt,
      });

    if (tokenError) {
      console.error('Token creation error:', tokenError);
      return NextResponse.json(
        { error: { code: 'TOKEN_ERROR', message: 'Failed to create verification token' } },
        { status: 500 }
      );
    }

    // Send email
    await sendVerificationEmail(email, newToken);

    return NextResponse.json(
      { data: { success: true, message: 'Verification email sent' } },
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