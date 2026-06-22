
import { createClient } from '@/lib/supabase/server';
import type { AuthUser } from '@/types/auth';

export async function getSession(): Promise<AuthUser | null> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      email: data.email,
      anonymousId: data.anonymous_id,
      isSeller: data.is_seller,
      isFirstPurchase: data.is_first_purchase,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
