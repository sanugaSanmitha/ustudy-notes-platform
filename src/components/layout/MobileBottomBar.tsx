'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ShoppingCart, User, LogIn, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function MobileBottomBar() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isReviewer, setIsReviewer] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      setIsReviewer(
        ['support@ustudy.dev', 'admin@ustudy.dev'].includes((user?.email || '').toLowerCase())
      );
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      setIsReviewer(
        ['support@ustudy.dev', 'admin@ustudy.dev'].includes((session?.user?.email || '').toLowerCase())
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  const tabs = isLoggedIn
    ? [
        { href: '/', label: 'Browse', icon: BookOpen },
        { href: '/cart', label: 'Cart', icon: ShoppingCart },
        { href: '/grades/upload', label: 'Uploader', icon: Upload },
        ...(isReviewer ? [{ href: '/support/grades', label: 'Queue', icon: User }] : []),
        { href: '/profile', label: 'Profile', icon: User },
      ]
    : [
        { href: '/', label: 'Browse', icon: BookOpen },
        { href: '/cart', label: 'Cart', icon: ShoppingCart },
        { href: '/login', label: 'Log in', icon: LogIn },
      ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white md:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-slate-500'
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
