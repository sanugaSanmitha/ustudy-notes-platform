'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Archive, Menu, Notebook, ShieldCheck, Upload, X } from 'lucide-react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { useSellerNav } from '@/hooks/useSellerNav';
import { cn } from '@/lib/utils';

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { isLoggedIn, isReviewer, sellerNavLink } = useSellerNav();

  const drawerLinks = isLoggedIn
    ? [
        {
          href: sellerNavLink.href,
          label: t('navUploader'),
          icon: sellerNavLink.labelKey === 'sellerNotesUpload' ? Upload : ShieldCheck,
        },
        { href: '/courses', label: t('navCourses'), icon: Notebook },
        { href: '/profile', label: t('navLocker'), icon: Archive },
        ...(isReviewer ? [{ href: '/admin/support', label: 'Support', icon: ShieldCheck }] : []),
      ]
    : [
        { href: '/courses', label: t('navCourses'), icon: Notebook },
        { href: '/login', label: t('navLogin'), icon: Archive },
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
      <aside className="absolute bottom-0 left-0 top-0 flex w-[min(149px,42vw)] flex-col bg-[#e4eeff] shadow-[4px_0_24px_rgba(31,47,102,0.12)]">
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

        <nav className="flex flex-1 flex-col gap-1 px-3 pb-6 pt-2">
          {drawerLinks.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/'
                ? pathname === '/'
                : href.startsWith('/courses')
                  ? pathname === '/courses' || pathname.startsWith('/courses/')
                  : pathname.startsWith(href);

            return (
              <Link
                key={href}
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
        </nav>
      </aside>
    </div>
  );
}

export function MobileNavMenuButton({
  open,
  onClick,
  className,
}: {
  open: boolean;
  onClick: () => void;
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? t('closeProfile') : 'Menu'}
      className={cn(
        'flex h-full w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#213f73] text-white transition-colors',
        className
      )}
    >
      <Menu className="size-5" />
    </button>
  );
}
