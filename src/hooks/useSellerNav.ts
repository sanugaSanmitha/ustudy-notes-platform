'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isStaffEmail } from '@/lib/auth/staff-emails';

export function useSellerNav() {
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

  const sellerNavLink = isSeller
    ? { href: '/notes/upload', label: 'Notes Upload' as const }
    : { href: '/grades/upload', label: 'Verify Seller' as const };

  return { isLoggedIn, isSeller, isReviewer, sellerNavLink };
}
