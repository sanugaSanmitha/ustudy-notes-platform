'use client';

import Link from 'next/link';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { STAFF_EMAILS } from '@/lib/auth/staff-emails';

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className="mt-auto border-t border-[rgba(195,198,215,0.2)] bg-white">
      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
        <div>
          <BrandLogo tone="ink" />
          <p className="mt-4 max-w-[320px] text-sm font-medium leading-5 tracking-[0.14px] text-[#434655]">
            {t('footerTagline1')}
            <br />
            {t('footerTagline2')}
          </p>
          <p className="mt-4 text-xs font-medium leading-4 tracking-[0.14px] text-[#737686]">
            © {new Date().getFullYear()} {t('footerCopyright')}
          </p>
        </div>

        <div>
          <p className="pb-2 text-sm font-semibold tracking-[0.14px] text-[#191b23]">{t('footerPlatform')}</p>
          <div className="mt-3 flex flex-col gap-3 text-sm font-medium tracking-[0.14px] text-[#434655]">
            <Link href="/" className="hover:text-[#004ac6]">
              {t('footerBrowse')}
            </Link>
            <Link href="/courses" className="hover:text-[#004ac6]">
              {t('navCourses')}
            </Link>
            <Link href="/cart" className="hover:text-[#004ac6]">
              {t('navCart')}
            </Link>
          </div>
        </div>

        <div>
          <p className="pb-2 text-sm font-semibold tracking-[0.14px] text-[#191b23]">{t('footerPolicies')}</p>
          <div className="mt-3 flex flex-col gap-3 text-sm font-medium tracking-[0.14px] text-[#434655]">
            <Link href="/privacy" className="hover:text-[#004ac6]">
              {t('footerPrivacy')}
            </Link>
            <Link href="/terms" className="hover:text-[#004ac6]">
              {t('footerTermsOfUse')}
            </Link>
            <Link href="/profile" className="hover:text-[#004ac6]">
              {t('footerMyAccount')}
            </Link>
          </div>
        </div>

        <div>
          <p className="pb-2 text-sm font-semibold tracking-[0.14px] text-[#191b23]">{t('footerHelp')}</p>
          <div className="mt-3 flex flex-col gap-3 text-sm font-medium tracking-[0.14px] text-[#434655]">
            <a href={`mailto:${STAFF_EMAILS[0]}`} className="hover:text-[#004ac6]">
              {t('footerSupport')}
            </a>
            <a href={`mailto:${STAFF_EMAILS[0]}`} className="hover:text-[#004ac6]">
              {t('footerContactUs')}
            </a>
            <Link href="/terms" className="hover:text-[#004ac6]">
              {t('footerTermsOfService')}
            </Link>
            <Link href="/privacy" className="hover:text-[#004ac6]">
              {t('footerPrivacyPolicy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
