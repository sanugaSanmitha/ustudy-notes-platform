import { cookies } from 'next/headers';
import { APP_LOCALES, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type AppLocale } from '@/lib/i18n/types';

export async function getServerLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_STORAGE_KEY)?.value;
  if (stored === 'zh-Hant') return 'zh-CN';
  if (stored && APP_LOCALES.includes(stored as AppLocale)) {
    return stored as AppLocale;
  }
  return DEFAULT_LOCALE;
}
