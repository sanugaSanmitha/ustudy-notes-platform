import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  AVATAR_COOKIE,
  CART_COUNT_COOKIE,
  DISPLAY_NAME_COOKIE,
  PROFILE_COMPLETE_COOKIE,
  SELLER_COOKIE,
} from '@/lib/auth/nav-cookies';

export async function POST() {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();

    const response = NextResponse.json(
      { data: { success: true } },
      { status: 200 }
    );
    const expired = { path: '/', maxAge: 0 };
    response.cookies.set(PROFILE_COMPLETE_COOKIE, '', expired);
    response.cookies.set(SELLER_COOKIE, '', expired);
    response.cookies.set(DISPLAY_NAME_COOKIE, '', expired);
    response.cookies.set(AVATAR_COOKIE, '', expired);
    response.cookies.set(CART_COUNT_COOKIE, '', expired);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: { code: 'LOGOUT_ERROR', message: 'Failed to logout' } },
      { status: 500 }
    );
  }
}
