export const STAFF_EMAILS = [
  'support@ustudy.dev',
  'admin@ustudy.dev',
  'assistant@ustudy.dev',
] as const;

export type StaffPortalRole = 'admin' | 'assistant' | 'support';

const STAFF_EMAIL_SET = new Set(STAFF_EMAILS.map((email) => email.toLowerCase()));

const DEFAULT_PORTAL_EMAILS: Record<StaffPortalRole, readonly string[]> = {
  admin: ['admin@ustudy.dev'],
  assistant: ['assistant@ustudy.dev'],
  support: ['support@ustudy.dev'],
};

function parseEmailList(raw: string | undefined, fallback: readonly string[]): string[] {
  if (!raw?.trim()) {
    return [...fallback];
  }
  const parsed = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...fallback];
}

export function getAdminPortalEmails(): string[] {
  return parseEmailList(process.env.ADMIN_PORTAL_EMAILS, DEFAULT_PORTAL_EMAILS.admin);
}

export function getAssistantPortalEmails(): string[] {
  return parseEmailList(process.env.ASSISTANT_PORTAL_EMAILS, DEFAULT_PORTAL_EMAILS.assistant);
}

export function getSupportPortalEmails(): string[] {
  return parseEmailList(process.env.SUPPORT_PORTAL_EMAILS, DEFAULT_PORTAL_EMAILS.support);
}

/** Transcript review notification recipients (all staff by default). */
export function getAdminReviewNotificationEmails(): string[] {
  return parseEmailList(process.env.ADMIN_REVIEW_EMAIL, STAFF_EMAILS);
}

export function isStaffEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return STAFF_EMAIL_SET.has(email.trim().toLowerCase());
}

export function isAdminPortalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminPortalEmails().includes(email.trim().toLowerCase());
}

export function isAssistantPortalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAssistantPortalEmails().includes(email.trim().toLowerCase());
}

export function isSupportPortalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getSupportPortalEmails().includes(email.trim().toLowerCase());
}

export function staffEmailExceptionMessage(): string {
  return STAFF_EMAILS.join(', ');
}
