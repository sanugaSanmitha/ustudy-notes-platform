function normalizeAdminEmails(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const admins = normalizeAdminEmails(process.env.ADMIN_REVIEW_EMAIL);
  if (admins.length === 0) {
    return false;
  }
  return admins.includes((email || '').trim().toLowerCase());
}

type AppRole = 'user' | 'support' | 'admin';

export function isAuthorizedAdmin(email: string | null | undefined, roles: AppRole[]) {
  return isAdminEmail(email) || roles.includes('admin');
}

export function isAuthorizedSupport(email: string | null | undefined, roles: AppRole[]) {
  return isAuthorizedAdmin(email, roles) || roles.includes('support');
}

/** Where to send the user immediately after a successful login. */
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
