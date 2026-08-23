'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Archive, BookOpen, Notebook, ShieldCheck, ShoppingCart, Upload } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { CartNavLink } from '@/components/cart/CartNavLink';
import { ProfileDrawer } from '@/components/account/ProfileDrawer';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useSellerNav } from '@/hooks/useSellerNav';
import { cn } from '@/lib/utils';

export function MainNavbar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { isLoggedIn, isReviewer, sellerNavLink, displayName, email, avatarUrl, refreshNavAuth } = useSellerNav();
  const [profileOpen, setProfileOpen] = useState(false);

  const navLinks = [
    { href: '/', label: t('navBrowser'), icon: BookOpen },
    { href: '/cart', label: t('navCart'), icon: ShoppingCart },
    {
      href: sellerNavLink.href,
      label: t('navUploader'),
      icon: sellerNavLink.labelKey === 'sellerNotesUpload' ? Upload : ShieldCheck,
    },
    { href: '/courses', label: t('navCourses'), icon: Notebook },
    { href: '/profile', label: t('navLocker'), icon: Archive },
  ] as const;

  const handleCloseProfile = useCallback(() => setProfileOpen(false), []);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.assign('/login');
  }, []);

  const initials = (displayName || email || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const profileDrawer = isLoggedIn ? (
    <ProfileDrawer
      open={profileOpen}
      onClose={handleCloseProfile}
      initials={initials || 'U'}
      avatarUrl={avatarUrl}
      initialEmail={email}
      initialFullName={displayName}
      onLogout={handleLogout}
      onProfileUpdated={refreshNavAuth}
    />
  ) : null;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-[8px]">
      <div className="flex items-center justify-between gap-3 px-4 py-2 md:hidden">
        <BrandLogo compact />
        <div className="flex items-center gap-2">
          <LocaleToggle />
          {isLoggedIn === null ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/70" />
          ) : isLoggedIn ? (
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
              aria-haspopup="dialog"
              className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#213f73] text-[11px] font-medium text-white"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                initials || 'U'
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-8 px-1.5 text-[#1f2f66] sm:px-2">
                <Link href="/login">{t('navLogin')}</Link>
              </Button>
              <Button asChild size="sm" className="h-8 rounded-full bg-[#1f2f66] px-2.5 text-white hover:bg-[#18244f] hover:text-white sm:px-3">
                <Link href="/register">{t('navRegister')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto hidden max-w-6xl items-center justify-between gap-3 px-4 py-2.5 md:flex">
        <BrandLogo className="hidden min-w-0 shrink-0 md:flex xl:min-w-[180px]" />

        <nav className="flex h-10 min-w-0 flex-1 items-stretch justify-center rounded-full bg-[#e4eeff] shadow-[0px_4px_7px_0px_rgba(0,0,0,0.25)] md:max-w-[720px]">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/'
                ? pathname === '/'
                : href.startsWith('/courses')
                  ? pathname === '/courses' || pathname.startsWith('/courses/')
                  : pathname.startsWith(href);
            const pillClassName = cn(
              'flex h-full min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1.5 text-[12px] font-normal transition-colors lg:gap-1.5 lg:px-3 lg:text-[13px]',
              isActive ? 'bg-[#213f73] text-white' : 'text-black hover:bg-white/40'
            );

            if (href === '/cart') {
              return (
                <CartNavLink
                  key={`${href}-${label}`}
                  href={href}
                  label={label}
                  icon={Icon}
                  isActive={isActive}
                  variant="pill"
                  className={pillClassName}
                />
              );
            }

            return (
              <Link key={`${href}-${label}`} href={href} className={pillClassName}>
                <Icon className="size-3.5 shrink-0" />
                <span className="hidden truncate lg:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 lg:min-w-[180px]">
          <LocaleToggle />
          {isLoggedIn === null ? (
            <div className="h-8 w-24 animate-pulse rounded-full bg-white/70 lg:w-36" />
          ) : isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-haspopup="dialog"
                className="flex items-center gap-2 text-left"
              >
                <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#213f73] text-xs font-medium text-white lg:h-[57px] lg:w-[64px]">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    initials || 'U'
                  )}
                </span>
                <span className="hidden max-w-[160px] text-left xl:block">
                  <span className="block truncate text-[13px] font-normal leading-tight text-black">{displayName}</span>
                  <span className="block truncate text-[11px] font-normal text-black/80">{email}</span>
                </span>
              </button>
              {isReviewer && (
                <Button asChild variant="ghost" size="sm" className="hidden text-[#1f2f66] xl:inline-flex">
                  <Link href="/admin/support">Support</Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="text-[#1f2f66]">
                <Link href="/login">{t('navLogin')}</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full bg-[#1f2f66] text-white hover:bg-[#18244f] hover:text-white">
                <Link href="/register">{t('navRegister')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
      {profileDrawer}
      <div className="h-14 shrink-0 md:h-[80px]" aria-hidden />
    </>
  );
}
