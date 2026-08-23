'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Banknote, BarChart3, ChevronDown, ClipboardList, FileArchive, FileText, LayoutDashboard, LogOut, NotebookPen, ScrollText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAdminPortalRole, type PortalRole } from '@/components/admin/admin-portal-context';

const ALL_NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, roles: ['admin'] as PortalRole[] },
  { href: '/admin/summary', label: 'Summary', icon: BarChart3, roles: ['admin'] as PortalRole[] },
  { href: '/admin/users', label: 'Users', icon: Users, roles: ['admin'] as PortalRole[] },
  { href: '/admin/materials', label: 'Materials', icon: FileArchive, roles: ['admin'] as PortalRole[] },
  { href: '/admin/payments', label: 'FPS Payments', icon: Banknote, roles: ['admin'] as PortalRole[] },
  { href: '/admin/notes', label: 'Note Verify', icon: NotebookPen, roles: ['admin'] as PortalRole[] },
  { href: '/admin/grades', label: 'Transcript Verify', icon: FileText, roles: ['admin', 'assistant', 'support'] as PortalRole[] },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText, roles: ['admin'] as PortalRole[] },
  { href: '/admin/support', label: 'Support Queue', icon: ClipboardList, roles: ['admin', 'support'] as PortalRole[] },
];

type AdminShellProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

function isNavItemActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ title, description, actions, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { portalRole, loading: roleLoading } = useAdminPortalRole();

  const navItems = useMemo(
    () => (portalRole ? ALL_NAV_ITEMS.filter((item) => item.roles.includes(portalRole)) : []),
    [portalRole]
  );

  const activeHref = useMemo(
    () => navItems.find(({ href, exact }) => isNavItemActive(pathname, href, exact))?.href ?? navItems[0]?.href ?? '',
    [navItems, pathname]
  );

  const portalTitle =
    portalRole === 'assistant'
      ? 'UStudy Assistant Portal'
      : portalRole === 'support'
        ? 'UStudy Team Portal'
        : portalRole === 'admin'
          ? 'UStudy Admin Portal'
          : 'UStudy Portal';

  const homeHref = portalRole === 'admin' ? '/admin' : '/admin/grades';

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.assign('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 lg:px-8">
          <Link href={homeHref} className="text-sm font-semibold text-slate-900">
            {portalTitle}
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600">
            <LogOut className="mr-2 size-4" />
            Log out
          </Button>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white lg:hidden">
        <div className="mx-auto max-w-[1440px] px-4">
          {roleLoading ? (
            <div className="my-3 h-10 animate-pulse rounded-md bg-slate-100" />
          ) : navItems.length > 0 ? (
            <div className="relative py-3">
              <label htmlFor="admin-mobile-nav" className="sr-only">
                Navigate to
              </label>
              <select
                id="admin-mobile-nav"
                value={activeHref}
                onChange={(event) => router.push(event.target.value)}
                className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {navItems.map(({ href, label }) => (
                  <option key={href} value={href}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
          <nav className="space-y-1 p-4">
            {roleLoading ? (
              <div className="space-y-2 px-3 py-2">
                <div className="h-9 animate-pulse rounded-md bg-slate-100" />
                <div className="h-9 animate-pulse rounded-md bg-slate-100" />
              </div>
            ) : null}
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const active = isNavItemActive(pathname, href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 lg:px-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export { useAdminPortalRole } from '@/components/admin/admin-portal-context';
