'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookMarked,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Wallet,
} from 'lucide-react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

export function AccountSidebar() {
  const pathname = usePathname();
  const { t } = useLocale();

  const accountLinks: Array<{
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
  }> = [
    { href: '/profile', label: t('lockerOverview'), icon: LayoutDashboard, exact: true },
    { href: '/profile/orders', label: t('lockerOrders'), icon: Package },
    { href: '/profile/purchases', label: t('lockerPurchases'), icon: ShoppingBag },
    { href: '/profile/sales', label: t('lockerSales'), icon: Store },
    { href: '/profile/wallet', label: t('lockerWallet'), icon: Wallet },
    { href: '/profile/grade-verification', label: t('lockerGradeVerification'), icon: BookMarked },
    { href: '/profile/verified-courses', label: t('lockerVerifiedCourses'), icon: BookMarked },
    { href: '/profile/settings', label: t('lockerSettings'), icon: Settings },
  ];

  return (
    <aside className="w-full min-w-0 shrink-0 md:w-64">
      <div className="rounded-xl border border-slate-200 bg-white p-2 md:p-3">
        <p className="hidden px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:block">
          {t('lockerRoom')}
        </p>
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          {accountLinks.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
