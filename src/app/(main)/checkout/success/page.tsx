import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PurchaseDownloadButton } from '@/components/notes/ListingPurchasePanel';
import { getAuthIdentity } from '@/lib/auth/session';
import { getServerT } from '@/lib/i18n/server-translate';
import { getBuyerFpsOrder } from '@/lib/orders/repository';

type PageProps = {
  searchParams?: { order_id?: string };
};

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const t = await getServerT();
  const orderId = searchParams?.order_id;
  const identity = await getAuthIdentity();
  const order = orderId && identity ? await getBuyerFpsOrder(identity.id, orderId) : null;
  const unlocked = order?.status === 'paid';

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card className="flex flex-col items-center px-6 py-12 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="size-8 text-emerald-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">
          {unlocked ? t('checkoutSuccessUnlockedTitle') : t('checkoutSuccessTitle')}
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {unlocked ? t('checkoutSuccessUnlockedBody') : t('checkoutSuccessBody')}
        </p>
        {orderId && (
          <p className="mt-2 text-xs text-slate-400">
            {t('checkoutSuccessOrderId')} {order?.paymentReference || orderId}
          </p>
        )}

        {unlocked && order?.items.length ? (
          <div className="mt-6 w-full space-y-3 text-left">
            {order.items.map((item) => (
              <div key={`${item.listingId}-${item.title}`} className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{item.courseCode}</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{item.title}</p>
                <div className="mt-3">
                  <PurchaseDownloadButton listingId={item.listingId} />
                </div>
                <Link
                  href={`/notes/${item.listingId}`}
                  className="mt-2 block text-center text-sm font-medium text-blue-600 hover:underline"
                >
                  {t('purchaseOpenNote')}
                </Link>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1 bg-blue-600 hover:bg-blue-700">
            <Link href="/profile/purchases">{t('checkoutSuccessViewPurchases')}</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/courses">{t('checkoutSuccessBrowseMore')}</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
