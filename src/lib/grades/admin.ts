import { cache } from 'react';
import { adminClient } from '@/lib/supabase/admin';
import {
  isAuthorizedAdmin,
  isAuthorizedAssistant,
  isAuthorizedSupport,
  isAuthorizedVerificationReviewer,
  type AppRole,
} from '@/lib/auth/admin-access';
import { getAuthIdentity } from '@/lib/auth/session';
import { getAssistantPortalEmails, isAdminPortalEmail } from '@/lib/auth/staff-emails';

export { isAdminPortalEmail as isAdminEmail };

type StaffAuthUser = {
  id: string;
  email: string | null;
};

export const resolveUserRoles = cache(async (userId: string): Promise<AppRole[]> => {
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
});

const getStaffAuthUser = cache(async (): Promise<StaffAuthUser | null> => {
  const identity = await getAuthIdentity();
  if (!identity) {
    return null;
  }

  return { id: identity.id, email: identity.email };
});

export async function requireAdminUser() {
  const user = await getStaffAuthUser();
  if (!user) {
    return { ok: false as const, status: 401, message: 'Not authenticated', user: null };
  }

  const roles = await resolveUserRoles(user.id);
  if (!isAuthorizedAdmin(user.email, roles)) {
    return { ok: false as const, status: 403, message: 'Admin access required', user };
  }

  return { ok: true as const, user, roles, isAdmin: true as const, isAssistant: false as const };
}

export async function requireVerificationReviewer() {
  const user = await getStaffAuthUser();
  if (!user) {
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
  const user = await getStaffAuthUser();
  if (!user) {
    return { ok: false as const, status: 401, message: 'Not authenticated', user: null };
  }

  const roles = await resolveUserRoles(user.id);
  const isAdmin = isAuthorizedAdmin(user.email, roles);
  const isAssistant = !isAdmin && isAuthorizedAssistant(user.email, roles);
  const isSupport = isAuthorizedSupport(user.email, roles);

  if (!isAdmin && !isAuthorizedVerificationReviewer(user.email, roles) && !isSupport) {
    return { ok: false as const, status: 403, message: 'Support or admin access required', user };
  }

  if (isAdmin) {
    return { ok: true as const, user, roles, isAdmin: true as const, isAssistant: false as const };
  }

  if (isAuthorizedVerificationReviewer(user.email, roles)) {
    return { ok: true as const, user, roles, isAdmin, isAssistant, isSupport };
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
