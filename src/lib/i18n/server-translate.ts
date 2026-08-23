import { getMessage, type MessageKey } from '@/lib/i18n/messages';
import { getServerLocale } from '@/lib/i18n/server-locale';

export async function getServerT() {
  const locale = await getServerLocale();
  return (key: MessageKey) => getMessage(locale, key);
}
