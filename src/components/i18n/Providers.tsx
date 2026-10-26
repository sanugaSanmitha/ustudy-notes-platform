'use client';

import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { TawkChat } from '@/components/support/TawkChat';
import type { AppLocale } from '@/lib/i18n/types';

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
}) {
  const tawkPropertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim();
  const tawkWidgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID?.trim() || 'default';

  return (
    <LocaleProvider initialLocale={initialLocale}>
      {children}
      {tawkPropertyId ? <TawkChat propertyId={tawkPropertyId} widgetId={tawkWidgetId} /> : null}
    </LocaleProvider>
  );
}
