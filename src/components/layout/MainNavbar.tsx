'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookOpen, LogOut, ShoppingCart, Upload, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Browse', icon: BookOpen },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/profile', label: 'Profile', icon: User },
] as const;
const REVIEWER_EMAILS = new Set(['support@ustudy.dev', 'admin@ustudy.dev']);

export function MainNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isReviewer, setIsReviewer] = useState(false);
  const navLinks = isLoggedIn
    ? [
        ...NAV_LINKS,
        { href: '/grades/upload', label: 'Uploader', icon: Upload },
        ...(isReviewer ? [{ href: '/support/grades', label: 'Support Queue', icon: User }] : []),
      ]
    : NAV_LINKS;

  const handleLogout = async () => {
    const supabase = createClient();

    await supabase.auth.signOut();
    await fetch('/api/auth/logout', { method: 'POST' });

    setIsLoggedIn(false);
    router.push('/login');
    router.refresh();
  };

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      setIsReviewer(REVIEWER_EMAILS.has((user?.email || '').toLowerCase()));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      setIsReviewer(REVIEWER_EMAILS.has((session?.user?.email || '').toLowerCase()));
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 hidden border-b border-slate-200 bg-white/95 backdrop-blur md:block">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-sm text-white">
            H
          </span>
          <span>HKUST Notes</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {isLoggedIn === null ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
          ) : isLoggedIn ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/profile">My account</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600"
              >
                <LogOut className="mr-2 size-4" />
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
