import { getGradeTier, getGradeTierFigmaGradient, getGradeTierGradient } from '@/lib/materials/grade-tiers';
import { cn } from '@/lib/utils';

type GradeBadgeCompactProps = {
  grade: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  labelClassName?: string;
  gradeClassName?: string;
  showBadgeIcon?: boolean;
  variant?: 'default' | 'figma';
};

export function GradeBadgeCompact({
  grade,
  size = 'md',
  className,
  labelClassName,
  gradeClassName,
  showBadgeIcon = true,
  variant = 'default',
}: GradeBadgeCompactProps) {
  const tier = getGradeTier(grade);

  if (variant === 'figma') {
    return (
      <div
        className={cn(
          'inline-flex h-[54px] w-[216px] shrink-0 flex-col items-start justify-center overflow-clip rounded-[10px] border border-solid border-[#fedf8a] px-8 py-1.5 text-left',
          className
        )}
        style={{ background: getGradeTierFigmaGradient(grade) }}
      >
        <span className={cn('text-[14px] font-bold uppercase leading-[17px] text-white', labelClassName)}>
          {showBadgeIcon ? `${tier.badge} ${tier.label}` : tier.label}
        </span>
        <span className={cn('mt-0.5 text-[14px] font-normal leading-[17px] text-white', gradeClassName)}>
          {grade}
        </span>
      </div>
    );
  }

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
      <span className={cn('text-[10px] font-semibold uppercase tracking-wide text-white/90', labelClassName)}>
        {showBadgeIcon ? `${tier.badge} ${tier.label}` : tier.label}
      </span>
      <span className={cn('mt-0.5 text-lg font-bold leading-none text-white', gradeClassName)}>{grade}</span>
    </div>
  );
}
