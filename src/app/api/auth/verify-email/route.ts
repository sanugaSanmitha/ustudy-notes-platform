import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { hashVerificationToken } from '@/lib/auth/utils';

const verifySchema = z.object({
  token: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Token is required' } },
        { status: 400 }
      );
    }

    const { token } = parsed.data;
    const tokenHash = hashVerificationToken(token);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from('verification_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      if (tokenError) {
        console.error('Verification token lookup error:', tokenError);
      }

      return NextResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'Invalid or expired verification token' } },
        { status: 400 }
      );
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: { code: 'TOKEN_EXPIRED', message: 'Verification link has expired' } },
        { status: 400 }
      );
    }

    if (tokenRecord.used_at) {
      return NextResponse.json(
        { error: { code: 'TOKEN_USED', message: 'This verification link has already been used' } },
        { status: 400 }
      );
    }

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(tokenRecord.user_id, {
      email_confirm: true,
    });

    if (authUpdateError) {
      console.error('Email confirmation error:', authUpdateError);
      return NextResponse.json(
        { error: { code: 'CONFIRMATION_ERROR', message: 'Failed to verify email' } },
        { status: 500 }
      );
    }

    const { error: tokenUpdateError } = await supabaseAdmin
      .from('verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    if (tokenUpdateError) {
      console.error('Verification token update error:', tokenUpdateError);
    }

    return NextResponse.json(
      { data: { success: true } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Verification failed' } },
      { status: 500 }
    );
  }
}
