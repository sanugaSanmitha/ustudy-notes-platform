import { getGradeTier, getGradeTierGradient } from '@/lib/materials/grade-tiers';
import { cn } from '@/lib/utils';

type GradeBadgeCompactProps = {
  grade: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function GradeBadgeCompact({ grade, size = 'md', className }: GradeBadgeCompactProps) {
  const tier = getGradeTier(grade);

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg min-w-[88px]',
    md: 'px-3 py-2 text-sm rounded-xl min-w-[104px]',
    lg: 'px-4 py-3 text-base rounded-2xl min-w-[120px]',
  };

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center text-center shadow-md',
        sizeClasses[size],
        className
      )}
      style={{ background: getGradeTierGradient(grade) }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/90">
        {tier.badge} {tier.label}
      </span>
      <span className="mt-0.5 text-lg font-bold leading-none text-white">{grade}</span>
    </div>
  );
}
