'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LogIn, ShieldCheck, ShoppingCart, Upload, User } from 'lucide-react';
import { useSellerNav } from '@/hooks/useSellerNav';
import { cn } from '@/lib/utils';

export function MobileBottomBar() {
  const pathname = usePathname();
  const { isLoggedIn, isReviewer, sellerNavLink } = useSellerNav();

  const tabs = isLoggedIn
    ? [
        { href: '/', label: 'Browse', icon: BookOpen },
        { href: '/cart', label: 'Cart', icon: ShoppingCart },
        {
          href: sellerNavLink.href,
          label: sellerNavLink.label === 'Notes Upload' ? 'Upload' : 'Verify',
          icon: sellerNavLink.label === 'Notes Upload' ? Upload : ShieldCheck,
        },
        ...(isReviewer ? [{ href: '/admin/support', label: 'Queue', icon: User }] : []),
        { href: '/profile', label: 'Account', icon: User },
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
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={`${href}-${label}`}
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
