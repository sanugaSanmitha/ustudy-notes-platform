import { redirect } from 'next/navigation';
import { CartClient } from '@/components/cart/CartClient';
import { getAuthIdentity } from '@/lib/auth/session';
import { getCartSummary } from '@/lib/cart/repository';
import { getServerT } from '@/lib/i18n/server-translate';

export default async function CartPage() {
  const t = await getServerT();
  const identity = await getAuthIdentity();
  if (!identity) {
    redirect('/login?next=/cart');
  }

  let initialCart = null;
  try {
    initialCart = await getCartSummary(identity.id);
  } catch (error) {
    console.error('Cart page load error:', error);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">{t('cartTitle')}</h1>
      <p className="mt-2 text-slate-600">{t('cartPageSubtitle')}</p>
      <CartClient initialCart={initialCart} />
    </div>
  );
}
