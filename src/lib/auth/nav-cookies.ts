import type { CookieOptions } from '@supabase/ssr';

export const PROFILE_COMPLETE_COOKIE = 'ustudy-pc';
export const SELLER_COOKIE = 'ustudy-seller';
export const DISPLAY_NAME_COOKIE = 'ustudy-dn';
export const AVATAR_COOKIE = 'ustudy-av';
export const CART_COUNT_COOKIE = 'ustudy-cc';

export function navCookieOptions(): CookieOptions {
  return {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  };
}

export function hasAuthSessionCookies(cookies: { name: string }[]) {
  return cookies.some((cookie) => cookie.name.includes('-auth-token'));
}

export function encodeNavCookieValue(value: string) {
  return encodeURIComponent(value).slice(0, 500);
}

export function decodeNavCookieValue(value: string | undefined | null) {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseCartCountCookie(value: string | undefined | null) {
  const count = Number.parseInt(value || '0', 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}
