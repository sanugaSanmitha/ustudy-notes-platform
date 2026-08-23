import Link from 'next/link';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  tone?: 'brand' | 'ink';
};

export function BrandLogo({ className, compact = false, tone = 'brand' }: BrandLogoProps) {
  return (
    <Link href="/" className={cn('flex items-center gap-2', className)}>
      <span className={cn('relative shrink-0 overflow-clip', compact ? 'size-7' : 'size-8')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/ustudy-logo.png"
          alt=""
          width={32}
          height={32}
          className="size-full object-contain"
        />
      </span>
      <span
        className={cn(
          'font-display font-bold',
          tone === 'ink' ? 'text-[#191b23]' : 'text-[#004ac6]',
          compact ? 'text-[16px] leading-6' : 'text-[24px] leading-8'
        )}
      >
        uStudy
      </span>
    </Link>
  );
}
