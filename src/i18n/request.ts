import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'zh-Hant'];
const defaultLocale = 'en';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && locales.includes(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: {},
  };
});
