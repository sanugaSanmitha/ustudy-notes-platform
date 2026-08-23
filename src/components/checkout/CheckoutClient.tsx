'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCart } from '@/hooks/useCart';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatHkd } from '@/lib/utils/cart-utils';
import { cn } from '@/lib/utils';
import type { CartSummary } from '@/types/cart';

type CheckoutClientProps = {
  cancelled?: boolean;
  initialCart?: CartSummary | null;
};

export function CheckoutClient({ cancelled = false, initialCart = null }: CheckoutClientProps) {
  const router = useRouter();
  const { t } = useLocale();
  const { cart, loading, error } = useCart(true, initialCart);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!cart || cart.items.length === 0) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'fps' }),
      });

      const payload = await response.json();

      if (response.status === 401) {
        router.push('/login?next=/checkout');
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error?.message || t('checkoutStartFailed'));
      }

      if (payload.payUrl) {
        window.location.href = payload.payUrl;
        return;
      }

      if (payload.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
        return;
      }

      throw new Error(t('checkoutUrlMissing'));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('checkoutStartFailed'));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return <Card className="mt-6 border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Card className="mt-6 flex flex-col items-center justify-center border-dashed px-6 py-16 text-center">
        <h2 className="text-lg font-medium text-slate-900">{t('checkoutNothingTitle')}</h2>
        <p className="mt-2 text-sm text-slate-500">{t('checkoutNothingBody')}</p>
        <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700">
          <Link href="/courses">{t('checkoutBrowseCourses')}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {cancelled && (
          <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {t('checkoutPaymentCancelled')}
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t('checkoutPaymentMethod')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('checkoutPaymentMethodDesc')}</p>

          <div className="mt-4 flex items-start gap-3 rounded-lg border border-blue-500 bg-blue-50 p-4">
            <Wallet className="mt-0.5 size-5 shrink-0 text-blue-600" />
            <div>
              <p className="font-medium text-slate-900">{t('checkoutFpsTitle')}</p>
              <p className="mt-1 text-sm text-slate-500">{t('checkoutFpsDesc')}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t('checkoutItems')}</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-slate-500">{item.courseCode}</p>
                </div>
                <p className={cn('font-medium', item.isFree ? 'text-emerald-600' : 'text-slate-900')}>
                  {item.isFree ? t('cartFree') : formatHkd(item.priceHkd)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="h-fit p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold text-slate-900">{t('checkoutTotalDue')}</h2>
        <dl className="mt-4 space-y-3 text-sm text-slate-600">
          <div className="flex justify-between">
            <dt>{t('cartSubtotal')}</dt>
            <dd>{formatHkd(cart.subtotalHkd)}</dd>
          </div>
          {cart.discountHkd > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>{t('checkoutDiscount')}</dt>
              <dd>-{formatHkd(cart.discountHkd)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
            <dt>{t('cartTotal')}</dt>
            <dd>{formatHkd(cart.totalHkd)}</dd>
          </div>
        </dl>

        {submitError && <p className="mt-4 text-sm text-red-600">{submitError}</p>}

        <Button
          type="button"
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700"
          onClick={handlePay}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t('checkoutRedirecting')}
            </>
          ) : (
            t('checkoutContinueFps')
          )}
        </Button>

        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link href="/cart">{t('checkoutBackToCart')}</Link>
        </Button>
      </Card>
    </div>
  );
}
