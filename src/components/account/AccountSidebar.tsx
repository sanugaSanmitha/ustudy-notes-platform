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
  UserCircle,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCOUNT_LINKS: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}> = [
  { href: '/profile', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/profile/personal', label: 'Personal Information', icon: UserCircle },
  { href: '/profile/orders', label: 'Orders', icon: Package },
  { href: '/profile/purchases', label: 'Purchases', icon: ShoppingBag },
  { href: '/profile/sales', label: 'Sales', icon: Store },
  { href: '/profile/wallet', label: 'Wallet', icon: Wallet },
  { href: '/profile/grade-verification', label: 'Grade Verification', icon: BookMarked },
  { href: '/profile/verified-courses', label: 'Verified Courses', icon: BookMarked },
  { href: '/profile/settings', label: 'Settings', icon: Settings },
];

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 md:w-64">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">My Account</p>
        <nav className="space-y-1">
          {ACCOUNT_LINKS.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
