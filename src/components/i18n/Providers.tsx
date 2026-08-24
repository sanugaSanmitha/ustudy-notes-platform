'use client';

import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import type { AppLocale } from '@/lib/i18n/types';

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
}) {
  return <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>;
}
