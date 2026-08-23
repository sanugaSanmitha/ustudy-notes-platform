'use client';

import { useLocale } from '@/components/i18n/LocaleProvider';

export function HomeHero() {
  const { t } = useLocale();

  return (
    <section className="relative mb-10 text-center">
      <h1 className="px-1 font-display text-[28px] font-bold leading-[1.2] tracking-[-0.64px] text-[#191b23] sm:text-[48px] sm:leading-[60px] sm:tracking-[-0.96px]">
        {t('homeTitleLine1')}{' '}
        <span className="text-[#386abf] sm:mt-0 sm:block">{t('homeTitleLine2')}</span>
      </h1>
      <p className="mx-auto mt-4 max-w-[662px] px-1 text-[16px] font-normal leading-normal text-[#828282] sm:text-[18px]">
        {t('homeSubtitle')}
      </p>
    </section>
  );
}
