import { redirect } from 'next/navigation';
import { CheckoutClient } from '@/components/checkout/CheckoutClient';
import { getAuthIdentity } from '@/lib/auth/session';
import { getCartSummary } from '@/lib/cart/repository';
import { getServerT } from '@/lib/i18n/server-translate';

type PageProps = {
  searchParams?: { cancelled?: string };
};

export default async function CheckoutPage({ searchParams }: PageProps) {
  const t = await getServerT();
  const identity = await getAuthIdentity();
  if (!identity) {
    redirect('/login?next=/checkout');
  }

  let initialCart = null;
  try {
    initialCart = await getCartSummary(identity.id);
  } catch (error) {
    console.error('Checkout page load error:', error);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">{t('checkoutPageTitle')}</h1>
      <p className="mt-2 text-slate-600">{t('checkoutPageSubtitle')}</p>
      <CheckoutClient cancelled={searchParams?.cancelled === '1'} initialCart={initialCart} />
    </div>
  );
}
