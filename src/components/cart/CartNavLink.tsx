'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { useSellerNav } from '@/hooks/useSellerNav';
import { cn } from '@/lib/utils';

type CartNavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive?: boolean;
  className?: string;
  showLabel?: boolean;
  variant?: 'capsule' | 'pill';
};

export function CartNavLink({
  href,
  label,
  icon: Icon,
  isActive = false,
  className,
  showLabel = true,
  variant = 'capsule',
}: CartNavLinkProps) {
  const { isLoggedIn, cartItemCount } = useSellerNav();
  const badge =
    isLoggedIn && cartItemCount > 0 ? (
      <span
        className={cn(
          'absolute flex size-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-semibold text-white',
          variant === 'pill' || showLabel ? '-right-0.5 -top-0.5' : 'right-1.5 top-1.5'
        )}
      >
        {cartItemCount > 9 ? '9+' : cartItemCount}
      </span>
    ) : null;

  if (variant === 'pill') {
    return (
      <Link
        href={href}
        aria-label={label}
        className={cn(
          'relative flex h-full min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[12px] font-normal transition-colors lg:px-3 lg:text-[13px]',
          isActive ? 'bg-[#213f73] text-white' : 'text-black hover:bg-white/40',
          className
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
        {badge}
      </Link>
    );
  }

  return (
    <Link href={href} aria-label={label} className={cn('relative', className)}>
      <Icon className="size-4 shrink-0 stroke-[1.75]" />
      {showLabel ? <span className="truncate">{label}</span> : null}
      {badge}
    </Link>
  );
}
