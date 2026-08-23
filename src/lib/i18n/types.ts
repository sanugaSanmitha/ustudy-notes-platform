export type AppLocale = 'en' | 'zh-CN';

export const DEFAULT_LOCALE: AppLocale = 'zh-CN';

/** Staff portals always render in English regardless of user locale preference. */
export const ENGLISH_ONLY_PATH_PREFIXES = ['/admin', '/support'] as const;

export function isEnglishOnlyPath(pathname: string) {
  return ENGLISH_ONLY_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export const APP_LOCALES: AppLocale[] = ['zh-CN', 'en'];

export const LOCALE_STORAGE_KEY = 'ustudy-locale';

export const LOCALE_LABELS: Record<AppLocale, string> = {
  'zh-CN': '中文',
  en: 'English',
};

export const THEME_LABELS: Record<AppLocale, string> = {
  'zh-CN': '浅蓝色',
  en: 'Light Blue',
};
