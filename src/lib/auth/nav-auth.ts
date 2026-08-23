import { cache } from 'react';
import { cookies } from 'next/headers';
import { getAuthIdentity } from '@/lib/auth/session';
import { isStaffEmail } from '@/lib/auth/staff-emails';
import {
  AVATAR_COOKIE,
  CART_COUNT_COOKIE,
  DISPLAY_NAME_COOKIE,
  SELLER_COOKIE,
  decodeNavCookieValue,
  parseCartCountCookie,
} from '@/lib/auth/nav-cookies';
import { createClient } from '@/lib/supabase/server';

export type NavAuthSnapshot = {
  userId: string | null;
  isLoggedIn: boolean;
  isSeller: boolean;
  isReviewer: boolean;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  cartItemCount: number;
};

const GUEST_SNAPSHOT: NavAuthSnapshot = {
  userId: null,
  isLoggedIn: false,
  isSeller: false,
  isReviewer: false,
  displayName: null,
  email: null,
  avatarUrl: null,
  cartItemCount: 0,
};

export const getNavAuthSnapshot = cache(async (): Promise<NavAuthSnapshot> => {
  const identity = await getAuthIdentity();

  if (!identity) {
    return GUEST_SNAPSHOT;
  }

  const cookieStore = cookies();
  const email = identity.email;
  const isReviewer = isStaffEmail(email);
  const sellerCookie = cookieStore.get(SELLER_COOKIE)?.value;
  const displayNameCookie = cookieStore.get(DISPLAY_NAME_COOKIE)?.value;
  const avatarCookie = cookieStore.get(AVATAR_COOKIE)?.value;
  const cartItemCount = parseCartCountCookie(cookieStore.get(CART_COUNT_COOKIE)?.value);

  if (displayNameCookie !== undefined && (sellerCookie === '0' || sellerCookie === '1')) {
    const displayName = decodeNavCookieValue(displayNameCookie);
    return {
      userId: identity.id,
      isLoggedIn: true,
      isSeller: sellerCookie === '1',
      isReviewer,
      displayName: displayName || email?.split('@')[0] || 'Account',
      email,
      avatarUrl: decodeNavCookieValue(avatarCookie) || null,
      cartItemCount,
    };
  }

  const supabase = createClient();
  const withAvatar = await supabase
    .from('users')
    .select('is_seller, full_name, avatar_url')
    .eq('id', identity.id)
    .maybeSingle();

  const profile = withAvatar.error?.message?.includes('avatar_url')
    ? (await supabase.from('users').select('is_seller, full_name').eq('id', identity.id).maybeSingle()).data
    : withAvatar.data;

  const isSeller =
    sellerCookie === '1' || sellerCookie === '0'
      ? sellerCookie === '1'
      : Boolean(profile?.is_seller);

  return {
    userId: identity.id,
    isLoggedIn: true,
    isSeller,
    isReviewer,
    displayName: profile?.full_name?.trim() || email?.split('@')[0] || 'Account',
    email,
    avatarUrl:
      profile && 'avatar_url' in profile && typeof profile.avatar_url === 'string'
        ? profile.avatar_url
        : null,
    cartItemCount,
  };
});
