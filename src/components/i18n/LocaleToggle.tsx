'use client';

import { useLocale } from '@/components/i18n/LocaleProvider';
import { cn } from '@/lib/utils';
import type { AppLocale } from '@/lib/i18n/types';

const OPTIONS: { locale: AppLocale; label: string }[] = [
  { locale: 'en', label: 'EN' },
  { locale: 'zh-CN', label: '中' },
];

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale, t, isEnglishOnly } = useLocale();

  if (isEnglishOnly) return null;

  return (
    <div
      role="group"
      aria-label={t('language')}
      className={cn(
        'inline-flex h-8 shrink-0 items-center rounded-full bg-[#e4eeff] p-0.5 shadow-[0px_2px_4px_0px_rgba(0,0,0,0.12)]',
        className
      )}
    >
      {OPTIONS.map((option) => {
        const active = locale === option.locale;
        return (
          <button
            key={option.locale}
            type="button"
            aria-pressed={active}
            aria-label={option.locale === 'en' ? 'English' : '中文'}
            onClick={() => setLocale(option.locale)}
            className={cn(
              'h-full min-w-[28px] rounded-full px-2 text-[11px] font-semibold leading-none transition-colors',
              active ? 'bg-[#213f73] text-white' : 'text-[#1f2f66]/70 hover:text-[#1f2f66]'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
