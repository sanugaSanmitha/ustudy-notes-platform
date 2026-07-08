'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FileText, LayoutDashboard, LogOut, ScrollText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type PortalRole = 'admin' | 'assistant' | 'support';

const ALL_NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, roles: ['admin'] as PortalRole[] },
  { href: '/admin/users', label: 'Users', icon: Users, roles: ['admin'] as PortalRole[] },
  { href: '/admin/grades', label: 'Verification Queue', icon: FileText, roles: ['admin', 'assistant', 'support'] as PortalRole[] },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText, roles: ['admin'] as PortalRole[] },
  { href: '/admin/support', label: 'Support Queue', icon: ClipboardList, roles: ['admin', 'support'] as PortalRole[] },
];

type AdminShellProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminShell({ title, description, actions, children }: AdminShellProps) {
  const pathname = usePathname();
  const [portalRole, setPortalRole] = useState<PortalRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.json())
      .then((result) => {
        const role = result?.data?.portalRole;
        if (role === 'admin' || role === 'assistant' || role === 'support') {
          setPortalRole(role);
        }
      })
      .catch(() => null)
      .finally(() => setRoleLoading(false));
  }, []);

  const navItems = useMemo(
    () => (portalRole ? ALL_NAV_ITEMS.filter((item) => item.roles.includes(portalRole)) : []),
    [portalRole]
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
              const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
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

export function useAdminPortalRole() {
  const [portalRole, setPortalRole] = useState<PortalRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.json())
      .then((result) => {
        const role = result?.data?.portalRole;
        if (role === 'admin' || role === 'assistant' || role === 'support') {
          setPortalRole(role);
        }
        setUserId(result?.data?.userId || null);
      })
      .finally(() => setLoading(false));
  }, []);

  return {
    portalRole,
    userId,
    loading,
    isAdmin: portalRole === 'admin',
    isAssistant: portalRole === 'assistant',
    isSupport: portalRole === 'support',
  };
}
