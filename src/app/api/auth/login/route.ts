import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '15 m'),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success } = await ratelimit.limit(`login:${ip}`);

    if (!success) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT', message: 'Too many login attempts. Try again later.' } },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid email or password' } },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: { code: 'AUTH_FAILED', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User profile not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        data: {
          user: {
            id: userProfile.id,
            email: userProfile.email,
            anonymousId: userProfile.anonymous_id,
            isSeller: userProfile.is_seller,
            isFirstPurchase: userProfile.is_first_purchase,
            createdAt: userProfile.created_at,
            updatedAt: userProfile.updated_at,
          },
          token: data.session.access_token,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Login failed' } },
      { status: 500 }
    );
  }
}
