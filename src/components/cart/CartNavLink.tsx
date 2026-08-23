'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { useSellerNav } from '@/hooks/useSellerNav';
import { cn } from '@/lib/utils';

type CartNavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  className?: string;
  variant?: 'default' | 'pill';
};

export function CartNavLink({
  href,
  label,
  icon: Icon,
  isActive,
  className,
  variant = 'default',
}: CartNavLinkProps) {
  const { isLoggedIn, cartItemCount } = useSellerNav();

  return (
    <Link
      href={href}
      className={cn(
        variant === 'pill'
          ? 'relative flex h-full items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-normal transition-colors'
          : 'relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        variant === 'pill'
          ? isActive
            ? 'bg-[#1f2f66] text-white'
            : 'text-black hover:bg-white/40'
          : isActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        className
      )}
    >
      <Icon className={cn(variant === 'pill' ? 'size-3.5 shrink-0' : 'size-4')} />
      <span className={variant === 'pill' ? 'hidden truncate lg:inline' : undefined}>{label}</span>
      {isLoggedIn && cartItemCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-semibold text-white">
          {cartItemCount > 9 ? '9+' : cartItemCount}
        </span>
      )}
    </Link>
  );
}
