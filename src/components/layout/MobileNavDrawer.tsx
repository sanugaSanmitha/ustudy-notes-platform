'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Archive, Menu, Notebook, ShieldCheck, Upload, X } from 'lucide-react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';
import { useSellerNav } from '@/hooks/useSellerNav';
import { cn } from '@/lib/utils';

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  onOpenProfile?: () => void;
};

export function MobileNavDrawer({ open, onClose, onOpenProfile }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { isLoggedIn, isReviewer, sellerNavLink, displayName, email, avatarUrl } = useSellerNav();

  const initials = (displayName || email || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const drawerLinks = [
    {
      href: sellerNavLink.href,
      label: t('navUploader'),
      icon: sellerNavLink.labelKey === 'sellerNotesUpload' ? Upload : ShieldCheck,
    },
    { href: '/courses', label: t('navCourses'), icon: Notebook },
    { href: '/profile', label: t('navLocker'), icon: Archive },
    ...(isReviewer ? [{ href: '/admin/support', label: t('navSupport'), icon: ShieldCheck }] : []),
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        aria-label={t('closeProfile')}
        onClick={onClose}
      />
      <aside className="absolute bottom-0 left-0 top-0 flex w-[min(149px,70vw)] flex-col bg-[#e4eeff] shadow-[4px_0_24px_rgba(31,47,102,0.12)]">
        <div className="flex items-center justify-end px-3 pb-2 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full text-[#1d1b20] hover:bg-white/40"
            aria-label={t('closeProfile')}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col px-5 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            {drawerLinks.map(({ href, label, icon: Icon }) => {
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
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-2 py-2.5 text-[13px] font-normal transition-colors',
                    isActive ? 'bg-white/70 text-black' : 'text-black/80 hover:bg-white/50'
                  )}
                >
                  <Icon className="size-5 shrink-0 stroke-[1.5]" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 px-2">
            <LocaleToggle variant="inset" className="h-8" />
          </div>

          {isLoggedIn && onOpenProfile ? (
            <button
              type="button"
              onClick={onOpenProfile}
              aria-haspopup="dialog"
              className="mt-auto flex w-full flex-col items-start gap-1 pb-1 pt-4 text-left transition-opacity hover:opacity-90"
            >
              <span className="flex size-[100px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#213f73] text-[24px] font-medium text-white">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  initials || 'U'
                )}
              </span>
              <span className="w-full truncate text-[13px] font-normal leading-normal text-black/80">
                {displayName || email?.split('@')[0] || 'Account'}
              </span>
              {email ? (
                <span className="w-full truncate text-[10px] font-normal leading-normal text-black/80">
                  {email}
                </span>
              ) : null}
            </button>
          ) : null}
        </nav>
      </aside>
    </div>
  );
}

export const MobileNavMenuButton = forwardRef<
  HTMLButtonElement,
  {
    open: boolean;
    onClick: () => void;
    className?: string;
  }
>(function MobileNavMenuButton({ open, onClick, className }, ref) {
  const { t } = useLocale();

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? t('closeProfile') : 'Menu'}
      className={cn(
        'flex shrink-0 items-center justify-center text-current transition-colors',
        className
      )}
    >
      <Menu className="size-5" />
    </button>
  );
});
