'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ShoppingCart } from 'lucide-react';
import { MobileNavMenuButton } from '@/components/layout/MobileNavDrawer';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { useSellerNav } from '@/hooks/useSellerNav';
import { cn } from '@/lib/utils';

type NavCapsuleProps = {
  menuOpen: boolean;
  onMenuClick: () => void;
  className?: string;
};

type Glider = {
  left: number;
  width: number;
  visible: boolean;
};

type CapsuleTarget = 'menu' | 'browser' | 'cart' | null;

export function NavCapsule({ menuOpen, onMenuClick, className }: NavCapsuleProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { isLoggedIn, cartItemCount } = useSellerNav();
  const browserActive = pathname === '/';
  const cartActive = pathname === '/cart' || pathname.startsWith('/cart/');
  const active: CapsuleTarget = menuOpen ? 'menu' : cartActive ? 'cart' : browserActive ? 'browser' : null;

  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const browserRef = useRef<HTMLAnchorElement>(null);
  const cartRef = useRef<HTMLAnchorElement>(null);
  const [glider, setGlider] = useState<Glider>({ left: 0, width: 0, visible: false });

  useLayoutEffect(() => {
    const nav = navRef.current;
    const menu = menuRef.current;
    const browser = browserRef.current;
    const cart = cartRef.current;
    if (!nav) return;

    const update = () => {
      const target = active === 'menu' ? menu : active === 'cart' ? cart : active === 'browser' ? browser : null;
      if (!target) {
        setGlider((current) => ({ ...current, visible: false }));
        return;
      }

      const navBox = nav.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      const insetX = 2;
      setGlider({
        left: box.left - navBox.left + insetX,
        width: Math.max(0, box.width - insetX * 2),
        visible: true,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    if (menu) observer.observe(menu);
    if (browser) observer.observe(browser);
    if (cart) observer.observe(cart);
    return () => observer.disconnect();
  }, [active, t, cartItemCount]);

  return (
    <div
      className={cn(
        'w-max max-w-full min-w-0 rounded-full shadow-[0px_4px_7px_0px_rgba(0,0,0,0.18)]',
        className
      )}
    >
      <nav
        ref={navRef}
        className="relative flex h-10 w-full items-stretch overflow-hidden rounded-full bg-[#e8eeff]"
      >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 rounded-full bg-[#2b3e75] transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          glider.visible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ left: glider.left, width: glider.width }}
      />

      <MobileNavMenuButton
        ref={menuRef}
        open={menuOpen}
        onClick={onMenuClick}
        className={cn('relative z-10 h-full w-9', active === 'menu' ? 'text-white' : 'text-[#1f2f66]')}
      />

      <Link
        ref={browserRef}
        href="/"
        className={cn(
          'relative z-10 flex items-center justify-center gap-1.5 px-3.5 text-[13px] font-medium transition-colors duration-300 max-[420px]:px-2.5',
          active === 'browser' ? 'text-white' : 'text-black'
        )}
      >
        <BookOpen className="size-4 shrink-0 stroke-[1.75]" />
        <span className="max-[420px]:hidden">{t('navBrowser')}</span>
      </Link>

      <Link
        ref={cartRef}
        href="/cart"
        aria-label={t('navCart')}
        className={cn(
          'relative z-10 flex items-center justify-center gap-1.5 px-3.5 text-[13px] font-medium transition-colors duration-300 max-[420px]:px-2.5',
          active === 'cart' ? 'text-white' : 'text-black'
        )}
      >
        <ShoppingCart className="size-4 shrink-0 stroke-[1.75]" />
        <span className="max-[420px]:hidden">{t('navCart')}</span>
        {isLoggedIn && cartItemCount > 0 ? (
          <span
            className={cn(
              'absolute right-1.5 top-1 flex size-4 items-center justify-center rounded-full text-[9px] font-semibold',
              active === 'cart' ? 'bg-white text-[#2b3e75]' : 'bg-[#2b3e75] text-white'
            )}
          >
            {cartItemCount > 9 ? '9+' : cartItemCount}
          </span>
        ) : null}
      </Link>
    </nav>
    </div>
  );
}
