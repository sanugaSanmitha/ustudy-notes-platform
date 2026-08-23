'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type CourseSearchBarProps = {
  defaultQuery?: string;
  variant?: 'default' | 'homepage' | 'catalog';
  extraParams?: Record<string, string>;
};

const COURSE_CODE_HINTS = ['COMP2011', 'MATH1014', 'PHYS1001'];

export function CourseSearchBar({
  defaultQuery = '',
  variant = 'default',
  extraParams,
}: CourseSearchBarProps) {
  const router = useRouter();
  const { t } = useLocale();
  const searchHints = useMemo(
    () => [t('courseSearchPlaceholder'), ...COURSE_CODE_HINTS],
    [t]
  );
  const [query, setQuery] = useState(defaultQuery);
  const [focused, setFocused] = useState(false);
  const [typedHint, setTypedHint] = useState(searchHints[0]);

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  useEffect(() => {
    if ((variant !== 'homepage' && variant !== 'catalog') || focused || query) {
      setTypedHint(searchHints[0]);
      return;
    }

    let hintIndex = 0;
    let charIndex = searchHints[0].length;
    let deleting = true;
    let timeoutId = 0;

    const tick = () => {
      const current = searchHints[hintIndex];

      if (!deleting) {
        charIndex += 1;
        setTypedHint(current.slice(0, charIndex));
        if (charIndex >= current.length) {
          deleting = true;
          timeoutId = window.setTimeout(tick, 1400);
          return;
        }
        timeoutId = window.setTimeout(tick, 68);
        return;
      }

      charIndex -= 1;
      setTypedHint(current.slice(0, Math.max(charIndex, 0)));
      if (charIndex <= 0) {
        deleting = false;
        hintIndex = (hintIndex + 1) % searchHints.length;
        timeoutId = window.setTimeout(tick, 320);
        return;
      }
      timeoutId = window.setTimeout(tick, 36);
    };

    timeoutId = window.setTimeout(tick, 1600);
    return () => window.clearTimeout(timeoutId);
  }, [focused, query, searchHints, variant]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    const params = new URLSearchParams();
    if (trimmed) {
      params.set('q', trimmed);
    }
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        if (value) {
          params.set(key, value);
        }
      }
    }
    const queryString = params.toString();
    router.push(queryString ? `/courses?${queryString}` : '/courses');
  };

  if (variant === 'catalog' || variant === 'homepage') {
    const showTypedHint = !focused && !query;
    const isCatalog = variant === 'catalog';

    return (
      <form
        onSubmit={handleSubmit}
        className={cn('w-full min-w-0 space-y-2', isCatalog && 'mx-auto flex flex-col items-center')}
      >
        <div className={cn('flex items-center gap-[17px]', isCatalog ? 'justify-center' : 'w-full max-w-full')}>
          <div
            className={cn(
              'relative h-[35px] overflow-hidden rounded-[40px] bg-[#e4eeff] shadow-[0px_4px_7px_0px_rgba(0,0,0,0.25)] transition-[width,box-shadow,transform] duration-300 ease-out',
              focused
                ? cn(
                    'scale-[1.01] shadow-[0px_6px_14px_0px_rgba(33,63,115,0.28)]',
                    isCatalog ? 'w-[min(520px,calc(100vw-10rem))]' : 'w-[min(520px,calc(100%-104px))]'
                  )
                : isCatalog
                  ? 'w-[min(304px,calc(100vw-10rem))]'
                  : 'w-[min(304px,calc(100%-104px))]'
            )}
          >
            <span className="pointer-events-none absolute left-[17px] top-1/2 z-10 size-5 -translate-y-1/2 overflow-clip transition-transform duration-300 ease-out">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/search-magnifier.svg"
                alt=""
                width={20}
                height={20}
                className={cn('size-full', focused && 'scale-110')}
              />
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={showTypedHint ? '' : t('courseSearchPlaceholder')}
              aria-label={t('courseSearchAriaLabel')}
              className="relative z-10 h-full w-full appearance-none rounded-[40px] border-0 bg-transparent pl-16 pr-4 text-[15px] font-normal leading-normal text-black outline-none placeholder:text-black"
            />
            {showTypedHint ? (
              <span className="pointer-events-none absolute left-16 top-1/2 z-10 flex -translate-y-1/2 items-center text-[15px] font-normal text-black">
                {typedHint}
                <span className="ml-px inline-block h-[14px] w-px bg-black animate-search-caret" />
              </span>
            ) : null}
          </div>
          <button
            type="submit"
            className="h-[36px] w-[87px] shrink-0 rounded-[18px] bg-[#213f73] text-[15px] font-normal text-white transition-transform duration-300 ease-out hover:scale-[1.04] hover:bg-[#1a325c] focus-visible:scale-[1.04]"
          >
            {t('courseSearchButton')}
          </button>
        </div>
        <p
          className={
            isCatalog
              ? 'text-center text-[12px] leading-5 text-[#434655]'
              : 'text-[12px] leading-[15px] text-[#828282]'
          }
        >
          {t('courseSearchBrowseHint')}{isCatalog ? '.' : ''}
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative flex min-w-0 flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('courseSearchPlaceholderLong')}
            className="rounded-xl py-3 pl-10 pr-4"
          />
        </div>
        <Button type="submit" className="w-full bg-blue-600 px-5 text-white hover:bg-blue-700 sm:w-auto">
          {t('courseSearchButton')}
        </Button>
      </div>
      <p className="text-sm text-slate-400">{t('courseSearchBrowseHint')}.</p>
    </form>
  );
}
