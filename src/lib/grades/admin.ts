import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/auth/admin-access';

export { isAdminEmail };

async function resolveUserRoles(userId: string) {
  const { data, error } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to resolve user roles:', error);
    return [];
  }

  return (data || []).map((row) => row.role as 'user' | 'support' | 'admin');
}

export async function requireAdminUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false as const, status: 401, message: 'Not authenticated', user: null };
  }

  const roles = await resolveUserRoles(user.id);
  const hasAdminRole = roles.includes('admin');
  if (!hasAdminRole && !isAdminEmail(user.email)) {
    return { ok: false as const, status: 403, message: 'Admin access required', user };
  }

  return { ok: true as const, user, roles };
}

export async function requireReviewerUser() {
  const adminAuth = await requireAdminUser();
  if (adminAuth.ok) {
    return adminAuth;
  }

  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false as const, status: 401, message: 'Not authenticated', user: null };
  }

  const roles = await resolveUserRoles(user.id);
  if (!roles.includes('support')) {
    return { ok: false as const, status: 403, message: 'Support or admin access required', user };
  }

  return { ok: true as const, user, roles };
}
