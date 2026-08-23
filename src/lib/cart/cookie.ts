import { NextResponse } from 'next/server';
import type { CartSummary } from '@/types/cart';
import { CART_COUNT_COOKIE, navCookieOptions } from '@/lib/auth/nav-cookies';

export function jsonWithCartCount(body: unknown, cart: CartSummary | null, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.cookies.set(CART_COUNT_COOKIE, String(cart?.itemCount ?? 0), {
    ...navCookieOptions(),
    httpOnly: false,
  });
  return response;
}
