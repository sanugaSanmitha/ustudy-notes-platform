import { getRequestConfig } from 'next-intl/server';

const locales = ['zh-CN', 'en'];
const defaultLocale = 'zh-CN';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && locales.includes(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: {},
  };
});
