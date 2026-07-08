import { isAdminPortalEmail, isAssistantPortalEmail, isSupportPortalEmail } from '@/lib/auth/staff-emails';

export type AppRole = 'user' | 'support' | 'admin' | 'assistant';

/** Full admin portal access (dashboard, users, audit, assign tasks). */
export function isAdminEmail(email: string | null | undefined): boolean {
  return isAdminPortalEmail(email);
}

export function isAssistantEmail(email: string | null | undefined): boolean {
  return isAssistantPortalEmail(email);
}

export function isSupportEmail(email: string | null | undefined): boolean {
  return isSupportPortalEmail(email);
}

export function isAuthorizedAdmin(email: string | null | undefined, roles: AppRole[]) {
  return isAdminEmail(email) || roles.includes('admin');
}

export function isAuthorizedAssistant(email: string | null | undefined, roles: AppRole[]) {
  return isAssistantEmail(email) || roles.includes('assistant');
}

export function isAuthorizedSupport(email: string | null | undefined, roles: AppRole[]) {
  return isAuthorizedAdmin(email, roles) || isSupportEmail(email) || roles.includes('support');
}

/** Can open verification queue and approve/reject assigned transcripts. */
export function isAuthorizedVerificationReviewer(email: string | null | undefined, roles: AppRole[]) {
  return (
    isAuthorizedAdmin(email, roles) ||
    isAuthorizedAssistant(email, roles) ||
    isAuthorizedSupport(email, roles)
  );
}

export function resolvePortalLandingPath(options: {
  profileCompleted: boolean;
  email: string | null | undefined;
  roles: AppRole[];
  next?: string | null;
}): string {
  if (!options.profileCompleted) {
    return '/complete-profile';
  }

  if (isAuthorizedAdmin(options.email, options.roles)) {
    return '/admin';
  }

  if (isAuthorizedAssistant(options.email, options.roles)) {
    return '/admin/grades';
  }

  if (isAuthorizedSupport(options.email, options.roles)) {
    return '/admin/grades';
  }

  const next = options.next?.trim();
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }

  return '/';
}

/** @deprecated Use resolvePortalLandingPath */
export function getPostLoginPath(options: {
  profileCompleted: boolean;
  isAdmin: boolean;
  next?: string | null;
}) {
  if (!options.profileCompleted) {
    return '/complete-profile';
  }

  if (options.isAdmin) {
    return '/admin';
  }

  const next = options.next?.trim();
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }

  return '/';
}
