'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isStaffEmail } from '@/lib/auth/staff-emails';
import type { NavAuthSnapshot } from '@/lib/auth/nav-auth';

import type { MessageKey } from '@/lib/i18n/messages';

type NavAuthState = {
  isLoggedIn: boolean | null;
  isSeller: boolean;
  isReviewer: boolean;
  sellerNavLink: { href: string; labelKey: Extract<MessageKey, 'sellerNotesUpload' | 'sellerVerifySeller'> };
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  cartItemCount: number;
  setCartItemCount: (count: number) => void;
  refreshNavAuth: () => Promise<void>;
};

const NavAuthContext = createContext<NavAuthState | null>(null);

export function NavAuthProvider({
  children,
  initialAuth,
}: {
  children: React.ReactNode;
  initialAuth?: NavAuthSnapshot;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(initialAuth ? initialAuth.isLoggedIn : null);
  const [isSeller, setIsSeller] = useState(initialAuth?.isSeller ?? false);
  const [isReviewer, setIsReviewer] = useState(initialAuth?.isReviewer ?? false);
  const [displayName, setDisplayName] = useState<string | null>(initialAuth?.displayName ?? null);
  const [email, setEmail] = useState<string | null>(initialAuth?.email ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAuth?.avatarUrl ?? null);
  const [cartItemCount, setCartItemCount] = useState(initialAuth?.cartItemCount ?? 0);
  const lastLoadedUserKey = useRef<string | null>(
    initialAuth?.userId ? `${initialAuth.userId}:${initialAuth.email || ''}` : initialAuth ? 'guest' : null
  );
  const loadRef = useRef<(userId: string | null, email: string | null, force?: boolean) => Promise<void>>(
    async () => undefined
  );
  const initialUserId = initialAuth?.userId ?? null;
  const hasServerAuth = useRef(Boolean(initialAuth));

  useEffect(() => {
    if (!initialAuth) return;
    setIsLoggedIn(initialAuth.isLoggedIn);
    setIsSeller(initialAuth.isSeller);
    setIsReviewer(initialAuth.isReviewer);
    setDisplayName(initialAuth.displayName);
    setEmail(initialAuth.email);
    setAvatarUrl(initialAuth.avatarUrl);
    setCartItemCount(initialAuth.cartItemCount);
    lastLoadedUserKey.current = initialAuth.userId
      ? `${initialAuth.userId}:${initialAuth.email || ''}`
      : 'guest';
  }, [initialAuth]);

  useEffect(() => {
    const supabase = createClient();

    const load = async (userId: string | null, nextEmail: string | null, force = false) => {
      const userKey = userId ? `${userId}:${nextEmail || ''}` : 'guest';
      if (!force && lastLoadedUserKey.current === userKey) {
        return;
      }
      lastLoadedUserKey.current = userKey;

      setIsLoggedIn(Boolean(userId));
      setIsReviewer(isStaffEmail(nextEmail));
      setEmail(nextEmail);

      if (!userId) {
        setIsSeller(false);
        setDisplayName(null);
        setAvatarUrl(null);
        setCartItemCount(0);
        return;
      }

      const withAvatar = await supabase
        .from('users')
        .select('is_seller, full_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      const profile = withAvatar.error?.message?.includes('avatar_url')
        ? (
            await supabase.from('users').select('is_seller, full_name').eq('id', userId).maybeSingle()
          ).data
        : withAvatar.data;

      setIsSeller(Boolean(profile?.is_seller));
      setDisplayName(profile?.full_name?.trim() || nextEmail?.split('@')[0] || 'Account');
      setAvatarUrl(
        profile && 'avatar_url' in profile && typeof profile.avatar_url === 'string' ? profile.avatar_url : null
      );
    };

    loadRef.current = load;

    if (!hasServerAuth.current) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        void load(session?.user?.id || null, session?.user?.email || null);
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }
      void load(session?.user?.id || null, session?.user?.email || null, true);
    });

    return () => subscription.unsubscribe();
  }, [initialUserId]);

  const refreshNavAuth = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await loadRef.current(session?.user?.id || null, session?.user?.email || null, true);
  }, []);

  const value = useMemo<NavAuthState>(
    () => ({
      isLoggedIn,
      isSeller,
      isReviewer,
      displayName,
      email,
      avatarUrl,
      cartItemCount,
      setCartItemCount,
      refreshNavAuth,
      sellerNavLink: isSeller
        ? { href: '/notes/upload', labelKey: 'sellerNotesUpload' }
        : { href: '/grades/upload', labelKey: 'sellerVerifySeller' },
    }),
    [isLoggedIn, isSeller, isReviewer, displayName, email, avatarUrl, cartItemCount, refreshNavAuth]
  );

  return <NavAuthContext.Provider value={value}>{children}</NavAuthContext.Provider>;
}

export function useSellerNav(): NavAuthState {
  const context = useContext(NavAuthContext);
  if (!context) {
    throw new Error('useSellerNav must be used within NavAuthProvider');
  }
  return context;
}
