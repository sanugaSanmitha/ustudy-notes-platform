import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getCurrentAuthUser } from '@/lib/auth/session';
import { getServerT } from '@/lib/i18n/server-translate';

export default async function LockerRoomPage() {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect('/login?next=/profile');
  }

  const t = await getServerT();

  const lockerLinks = [
    { href: '/profile/orders', label: t('lockerOrders'), description: t('lockerOrdersDesc') },
    { href: '/profile/purchases', label: t('lockerPurchases'), description: t('lockerPurchasesDesc') },
    { href: '/profile/sales', label: t('lockerSales'), description: t('lockerSalesDesc') },
    { href: '/profile/wallet', label: t('lockerWallet'), description: t('lockerWalletDesc') },
    { href: '/profile/grade-verification', label: t('lockerGradeVerification'), description: t('lockerGradeVerificationDesc') },
    { href: '/profile/verified-courses', label: t('lockerVerifiedCourses'), description: t('lockerVerifiedCoursesDesc') },
    { href: '/profile/settings', label: t('lockerSettings'), description: t('lockerSettingsDesc') },
  ] as const;

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">{t('lockerPageTitle')}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">{t('lockerPageSubtitle')}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-slate-500">{t('lockerAccountStatus')}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {user.isSeller ? t('lockerVerifiedSeller') : t('lockerBuyerStatus')}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">{t('lockerPrimaryAction')}</p>
          <div className="mt-3">
            {user.isSeller ? (
              <Button asChild className="bg-[#1f2f66] text-white hover:bg-[#18244f]">
                <Link href="/notes/upload">{t('lockerUploadNotes')}</Link>
              </Button>
            ) : (
              <Button asChild className="bg-[#1f2f66] text-white hover:bg-[#18244f]">
                <Link href="/grades/upload">{t('lockerVerifySeller')}</Link>
              </Button>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {lockerLinks.map((item) => (
          <Link key={item.href} href={item.href} prefetch={false} className="block">
            <Card className="h-full p-5 transition-colors hover:border-[#2a3e88] hover:bg-[#fafbfd]">
              <h2 className="text-base font-semibold text-slate-900">{item.label}</h2>
              <p className="mt-1 text-sm text-slate-600">{item.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
