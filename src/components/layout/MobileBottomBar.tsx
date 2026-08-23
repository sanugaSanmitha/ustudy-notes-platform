'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LogIn, Notebook, ShieldCheck, ShoppingCart, Upload, User } from 'lucide-react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { useSellerNav } from '@/hooks/useSellerNav';
import { cn } from '@/lib/utils';

export function MobileBottomBar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { isLoggedIn, isReviewer, sellerNavLink } = useSellerNav();

  const tabs = isLoggedIn
    ? [
        { href: '/', label: t('navBrowse'), icon: BookOpen },
        { href: '/cart', label: t('navCart'), icon: ShoppingCart },
        {
          href: sellerNavLink.href,
          label: sellerNavLink.labelKey === 'sellerNotesUpload' ? t('navUpload') : t('navVerify'),
          icon: sellerNavLink.labelKey === 'sellerNotesUpload' ? Upload : ShieldCheck,
        },
        { href: '/courses', label: t('navCourses'), icon: Notebook },
        { href: '/profile', label: t('navAccount'), icon: User },
        ...(isReviewer ? [{ href: '/admin/support', label: 'Queue', icon: User }] : []),
      ]
    : [
        { href: '/', label: t('navBrowse'), icon: BookOpen },
        { href: '/courses', label: t('navCourses'), icon: Notebook },
        { href: '/cart', label: t('navCart'), icon: ShoppingCart },
        { href: '/login', label: t('navLogin'), icon: LogIn },
      ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white md:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around gap-0.5 px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : href.startsWith('/courses')
                ? pathname === '/courses' || pathname.startsWith('/courses/')
                : pathname.startsWith(href);
          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium transition-colors sm:text-xs',
                isActive ? 'text-blue-600' : 'text-slate-500'
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="w-full truncate text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
