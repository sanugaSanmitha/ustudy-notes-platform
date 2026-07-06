/** Lightweight CSRF mitigation for admin mutations (Part 5 §5.3). */
export const ADMIN_CSRF_HEADER = 'X-Requested-With';
export const ADMIN_CSRF_VALUE = 'admin-portal';

export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set(ADMIN_CSRF_HEADER, ADMIN_CSRF_VALUE);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers, credentials: 'same-origin' });
}
