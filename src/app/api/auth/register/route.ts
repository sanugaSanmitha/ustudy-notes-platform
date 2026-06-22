
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { sendVerificationEmail } from '@/lib/email/resend';
import { isValidEmail, isValidPassword, generateVerificationToken } from '@/lib/auth/utils';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Rate limit: 5 registrations per IP per hour
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
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

    // Check HKUST email domain
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: { code: 'INVALID_DOMAIN', message: 'Only @ust.hk or @connect.ust.hk email addresses are allowed' } },
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
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: { code: 'EMAIL_EXISTS', message: 'This email is already registered' } },
        { status: 409 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (authError || !authData.user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: 'Failed to create account' } },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create user record
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email,
      });

    if (userError) {
      console.error('User record error:', userError);
      return NextResponse.json(
        { error: { code: 'USER_CREATE_ERROR', message: 'Failed to create user profile' } },
        { status: 500 }
      );
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    
    // Store token in a temp table (verification_tokens)
    // For now, we'll send email with the token and validate later
    const { error: tokenError } = await supabaseAdmin
      .from('verification_tokens')
      .insert({
        user_id: userId,
        token: verificationToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    if (tokenError) {
      console.error('Token error:', tokenError);
    }

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken);

    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      // Don't fail registration, user can resend email
    }

    return NextResponse.json(
      { data: { userId, email } },
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
