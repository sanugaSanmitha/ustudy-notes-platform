import AccountPlaceholderPage from '@/components/account/AccountPlaceholderPage';
import { getServerT } from '@/lib/i18n/server-translate';

export default async function SettingsPage() {
  const t = await getServerT();
  return <AccountPlaceholderPage title={t('lockerSettings')} description={t('placeholderSettingsDesc')} />;
}
