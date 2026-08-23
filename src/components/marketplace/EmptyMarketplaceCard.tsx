'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/i18n/LocaleProvider';

export function EmptyMarketplaceCard() {
  const { t } = useLocale();

  return (
    <Card className="flex flex-col items-center justify-center rounded-[20px] border-[#ededf9] bg-white px-6 py-16 text-center">
      <h3 className="text-lg font-medium text-slate-900">{t('homeNoNotesTitle')}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{t('homeNoNotesBody')}</p>
      <Button asChild variant="outline" className="mt-6 border-[#1f2f66] text-[#1f2f66]">
        <Link href="/register">{t('homeBecomeSeller')}</Link>
      </Button>
    </Card>
  );
}
