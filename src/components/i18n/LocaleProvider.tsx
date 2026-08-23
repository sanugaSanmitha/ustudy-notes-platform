'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getMessage, type MessageKey } from '@/lib/i18n/messages';
import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  isEnglishOnlyPath,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  THEME_LABELS,
  type AppLocale,
} from '@/lib/i18n/types';

function writeLocaleCookie(locale: AppLocale) {
  document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: MessageKey) => string;
  localeLabel: string;
  themeLabel: string;
  isEnglishOnly: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): AppLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === 'zh-Hant') return 'zh-CN';
  return stored && APP_LOCALES.includes(stored as AppLocale) ? (stored as AppLocale) : DEFAULT_LOCALE;
}

function readClientLocale(): AppLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const cookieMatch = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_STORAGE_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`)
  );
  const fromCookie = cookieMatch?.[1];
  if (fromCookie === 'zh-Hant') return 'zh-CN';
  if (fromCookie && APP_LOCALES.includes(fromCookie as AppLocale)) return fromCookie as AppLocale;
  return readStoredLocale();
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [locale, setLocaleState] = useState<AppLocale>(() => readClientLocale());
  const englishOnly = isEnglishOnlyPath(pathname);
  const effectiveLocale: AppLocale = englishOnly ? 'en' : locale;

  useEffect(() => {
    const stored = readStoredLocale();
    setLocaleState(stored);
    writeLocaleCookie(stored);
  }, []);

  const setLocale = useCallback(
    (next: AppLocale) => {
      if (englishOnly) return;
      setLocaleState(next);
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      writeLocaleCookie(next);
      document.documentElement.lang = next === 'zh-CN' ? 'zh-CN' : 'en';
      router.refresh();
    },
    [englishOnly, router]
  );

  useEffect(() => {
    document.documentElement.lang = effectiveLocale === 'zh-CN' ? 'zh-CN' : 'en';
  }, [effectiveLocale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: effectiveLocale,
      setLocale,
      t: (key) => getMessage(effectiveLocale, key),
      localeLabel: LOCALE_LABELS[effectiveLocale],
      themeLabel: THEME_LABELS[effectiveLocale],
      isEnglishOnly: englishOnly,
    }),
    [effectiveLocale, englishOnly, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
