'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isStaffEmail } from '@/lib/auth/staff-emails';

type NavAuthState = {
  isLoggedIn: boolean | null;
  isSeller: boolean;
  isReviewer: boolean;
  sellerNavLink: { href: string; label: 'Notes Upload' | 'Verify Seller' };
};

const NavAuthContext = createContext<NavAuthState | null>(null);

export function NavAuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [isReviewer, setIsReviewer] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const load = async (userId: string | null, email: string | null) => {
      setIsLoggedIn(Boolean(userId));
      setIsReviewer(isStaffEmail(email));

      if (!userId) {
        setIsSeller(false);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('is_seller')
        .eq('id', userId)
        .maybeSingle();

      setIsSeller(Boolean(profile?.is_seller));
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      void load(user?.id || null, user?.email || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session?.user?.id || null, session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<NavAuthState>(
    () => ({
      isLoggedIn,
      isSeller,
      isReviewer,
      sellerNavLink: isSeller
        ? { href: '/notes/upload', label: 'Notes Upload' }
        : { href: '/grades/upload', label: 'Verify Seller' },
    }),
    [isLoggedIn, isSeller, isReviewer]
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
