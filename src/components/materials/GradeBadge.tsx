'use client';

import { getGradeTier, type GradeTier } from '@/lib/materials/grade-tiers';
import { cn } from '@/lib/utils';

interface GradeBadgeProps {
  grade: string;
  courseCode: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getBadgeStyles(grade: string) {
  const tier: GradeTier = getGradeTier(grade);

  const styles: Record<
    string,
    {
      background: string;
      textColor: string;
      border: string;
      shadow: string;
    }
  > = {
    platinum: {
      background: `linear-gradient(135deg, ${tier.color} 0%, ${tier.secondaryColor} 100%)`,
      textColor: 'text-white',
      border: 'border-2 border-yellow-400',
      shadow: 'shadow-yellow-500/50',
    },
    gold: {
      background: `linear-gradient(135deg, ${tier.color} 0%, ${tier.secondaryColor} 100%)`,
      textColor: 'text-white',
      border: 'border-2 border-yellow-500',
      shadow: 'shadow-yellow-400/50',
    },
    silver_gold: {
      background: `linear-gradient(135deg, ${tier.color} 0%, ${tier.secondaryColor} 100%)`,
      textColor: 'text-white',
      border: 'border-2 border-gray-400',
      shadow: 'shadow-gray-400/50',
    },
    green_gold: {
      background: `linear-gradient(135deg, ${tier.color} 0%, ${tier.secondaryColor} 100%)`,
      textColor: 'text-white',
      border: 'border-2 border-green-400',
      shadow: 'shadow-green-400/50',
    },
    green_silver: {
      background: `linear-gradient(135deg, ${tier.color} 0%, ${tier.secondaryColor} 100%)`,
      textColor: 'text-white',
      border: 'border-2 border-green-500',
      shadow: 'shadow-green-500/50',
    },
    green_bronze: {
      background: `linear-gradient(135deg, ${tier.color} 0%, ${tier.secondaryColor} 100%)`,
      textColor: 'text-white',
      border: 'border-2 border-green-600',
      shadow: 'shadow-green-600/50',
    },
  };

  return { tier, style: styles[tier.tier] || styles.green_silver };
}

export function GradeBadge({ grade, courseCode, size = 'md', showLabel = true }: GradeBadgeProps) {
  const { tier, style } = getBadgeStyles(grade);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-2xl',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center space-x-2 shadow-lg transform transition-transform hover:scale-105',
        sizeClasses[size],
        style.border,
        style.shadow
      )}
      style={{ background: style.background }}
    >
      <span className={cn(style.textColor, 'font-bold')}>
        {courseCode}: {grade}
      </span>
      <span className={style.textColor}>{tier.badge}</span>
      {showLabel && <span className={cn(style.textColor, 'text-xs opacity-90')}>{tier.label}</span>}
    </div>
  );
}
