import type { SupabaseClient } from '@supabase/supabase-js';
import { generateVerificationToken, hashVerificationToken } from '@/lib/auth/utils';

export async function findAuthUserByEmail(
  supabaseAdmin: SupabaseClient,
  email: string
) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) {
      console.error('Auth user lookup error:', error);
      return null;
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email
    );

    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

export async function resolveUserForVerification(
  supabaseAdmin: SupabaseClient,
  email: string
): Promise<{ userId: string; isVerified: boolean } | null> {
  const normalizedEmail = email.toLowerCase();

  let userId: string | undefined;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (profileError) {
    console.error('Profile lookup error:', profileError);
    return null;
  }

  userId = profile?.id;

  if (!userId) {
    const authUser = await findAuthUserByEmail(supabaseAdmin, normalizedEmail);

    if (!authUser) {
      return null;
    }

    userId = authUser.id;

    const { error: repairError } = await supabaseAdmin
      .from('users')
      .upsert({ id: userId, email: normalizedEmail }, { onConflict: 'id' });

    if (repairError) {
      console.error('Failed to repair public.users row:', repairError);
      return null;
    }
  }

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (authError || !authUser?.user) {
    console.error('Auth user fetch error:', authError);
    return null;
  }

  return {
    userId,
    isVerified: !!authUser.user.email_confirmed_at,
  };
}

export async function replaceVerificationToken(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<{ token: string; expiresAt: string } | null> {
  const token = generateVerificationToken();
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: deleteError } = await supabaseAdmin
    .from('verification_tokens')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Token delete error:', deleteError);
    return null;
  }

  const { error: insertError } = await supabaseAdmin
    .from('verification_tokens')
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

  if (insertError) {
    console.error('Token creation error:', insertError);
    return null;
  }

  return { token, expiresAt };
}
