import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import {
  isAuthorizedAdmin,
  isAuthorizedAssistant,
  isAuthorizedSupport,
  isAuthorizedVerificationReviewer,
  type AppRole,
} from '@/lib/auth/admin-access';
import { getAssistantPortalEmails, isAdminPortalEmail } from '@/lib/auth/staff-emails';

export { isAdminPortalEmail as isAdminEmail };

async function resolveUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to resolve user roles:', error);
    return [];
  }

  return (data || [])
    .map((row) => row.role as AppRole)
    .filter((role): role is AppRole =>
      role === 'user' || role === 'support' || role === 'admin' || role === 'assistant'
    );
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
  if (!isAuthorizedAdmin(user.email, roles)) {
    return { ok: false as const, status: 403, message: 'Admin access required', user };
  }

  return { ok: true as const, user, roles, isAdmin: true as const, isAssistant: false as const };
}

export async function requireVerificationReviewer() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false as const, status: 401, message: 'Not authenticated', user: null };
  }

  const roles = await resolveUserRoles(user.id);
  if (!isAuthorizedVerificationReviewer(user.email, roles)) {
    return { ok: false as const, status: 403, message: 'Verification reviewer access required', user };
  }

  const isAdmin = isAuthorizedAdmin(user.email, roles);
  const isAssistant = !isAdmin && isAuthorizedAssistant(user.email, roles);
  const isSupport = !isAdmin && !isAssistant && isAuthorizedSupport(user.email, roles);

  return { ok: true as const, user, roles, isAdmin, isAssistant, isSupport };
}

export async function requireReviewerUser() {
  const adminAuth = await requireAdminUser();
  if (adminAuth.ok) {
    return adminAuth;
  }

  const verificationAuth = await requireVerificationReviewer();
  if (verificationAuth.ok) {
    return verificationAuth;
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
  if (!isAuthorizedSupport(user.email, roles)) {
    return { ok: false as const, status: 403, message: 'Support or admin access required', user };
  }

  return {
    ok: true as const,
    user,
    roles,
    isAdmin: false as const,
    isAssistant: false as const,
  };
}

export async function listAssistantStaff() {
  return listVerificationStaff(['assistant']);
}

export async function listVerificationStaff(roleFilter?: Array<'assistant' | 'support' | 'admin'>) {
  const rolesToInclude = roleFilter || ['assistant', 'support', 'admin'];
  const userIds = new Set<string>();
  const roleByUser = new Map<string, Set<string>>();

  const { data: roleRows } = await adminClient
    .from('user_roles')
    .select('user_id, role')
    .in('role', rolesToInclude);

  for (const row of roleRows || []) {
    userIds.add(row.user_id);
    if (!roleByUser.has(row.user_id)) roleByUser.set(row.user_id, new Set());
    roleByUser.get(row.user_id)?.add(row.role);
  }

  if (rolesToInclude.includes('assistant')) {
    const assistantEmails = getAssistantPortalEmails();
    if (assistantEmails.length > 0) {
      const { data: emailRows } = await adminClient
        .from('users')
        .select('id')
        .in('email', assistantEmails);
      for (const row of emailRows || []) {
        userIds.add(row.id);
        if (!roleByUser.has(row.id)) roleByUser.set(row.id, new Set());
        roleByUser.get(row.id)?.add('assistant');
      }
    }
  }

  if (userIds.size === 0) return [];

  const { data: users } = await adminClient
    .from('users')
    .select('id, email, full_name')
    .in('id', Array.from(userIds))
    .order('full_name', { ascending: true });

  return (users || []).map((user) => ({
    ...user,
    roles: Array.from(roleByUser.get(user.id) || []),
  }));
}
