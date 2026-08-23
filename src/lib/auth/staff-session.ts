import { cache } from 'react';
import {
  isAuthorizedAdmin,
  isAuthorizedAssistant,
  isAuthorizedSupport,
  isAuthorizedVerificationReviewer,
} from '@/lib/auth/admin-access';
import { getAuthIdentity } from '@/lib/auth/session';
import { listVerificationStaff, resolveUserRoles } from '@/lib/grades/admin';
import type { PortalRole, StaffMember } from '@/types/admin-portal';

export type AdminPortalSnapshot = {
  portalRole: PortalRole | null;
  userId: string | null;
  staff: StaffMember[];
};

const EMPTY_SNAPSHOT: AdminPortalSnapshot = {
  portalRole: null,
  userId: null,
  staff: [],
};

export const getAdminPortalSnapshot = cache(async (): Promise<AdminPortalSnapshot> => {
  const identity = await getAuthIdentity();
  if (!identity) {
    return EMPTY_SNAPSHOT;
  }

  const roles = await resolveUserRoles(identity.id);
  const isAdmin = isAuthorizedAdmin(identity.email, roles);
  const isAssistant = isAuthorizedAssistant(identity.email, roles);
  const isSupport = isAuthorizedSupport(identity.email, roles);

  if (!isAdmin && !isAssistant && !isSupport && !isAuthorizedVerificationReviewer(identity.email, roles)) {
    return { ...EMPTY_SNAPSHOT, userId: identity.id };
  }

  const portalRole: PortalRole = isAdmin ? 'admin' : isAssistant ? 'assistant' : 'support';
  const staff =
    portalRole === 'admin' ? ((await listVerificationStaff(['assistant', 'support', 'admin'])) as StaffMember[]) : [];

  return {
    portalRole,
    userId: identity.id,
    staff,
  };
});
