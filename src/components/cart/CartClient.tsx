'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCart } from '@/hooks/useCart';
import { useSellerNav } from '@/hooks/useSellerNav';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatHkd } from '@/lib/utils/cart-utils';
import { CART_COUNT_COOKIE } from '@/lib/auth/nav-cookies';
import { cn } from '@/lib/utils';
import type { CartSummary } from '@/types/cart';

export function CartClient({ initialCart = null }: { initialCart?: CartSummary | null }) {
  const router = useRouter();
  const { t } = useLocale();
  const { setCartItemCount } = useSellerNav();
  const { cart, loading, error, refresh } = useCart(true, initialCart);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const count = cart?.itemCount ?? initialCart?.itemCount ?? 0;
    setCartItemCount(count);
    document.cookie = `${CART_COUNT_COOKIE}=${count}; Path=/; Max-Age=2592000; SameSite=Lax`;
  }, [cart?.itemCount, initialCart?.itemCount, setCartItemCount]);

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (response.status === 401) {
        router.push('/login?next=/cart');
        return;
      }

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error?.message || t('cartRemoveFailed'));
      }

      await refresh(true);
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingId(null);
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
    return (
      <Card className="mt-6 border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </Card>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Card className="mt-6 flex flex-col items-center justify-center border-dashed px-6 py-16 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-blue-50 text-2xl">
          🛒
        </div>
        <h2 className="text-lg font-medium text-slate-900">{t('cartEmptyTitle')}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">{t('cartEmptyBody')}</p>
        <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700">
          <Link href="/courses">{t('cartBrowseNotes')}</Link>
        </Button>
      </Card>
    );
  }

  const progress = cart.itemsUntilFree > 0 ? ((3 - cart.itemsUntilFree) / 3) * 100 : 100;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {cart.itemsUntilFree > 0 ? (
          <Card className="border-blue-200 bg-blue-50/60 p-4">
            <p className="text-sm font-medium text-blue-900">
              {(cart.itemsUntilFree === 1 ? t('cartBuyMoreFree') : t('cartBuyMoreFreePlural')).replace(
                '{count}',
                String(cart.itemsUntilFree)
              )}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </Card>
        ) : (
          <Card className="border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-800">
            {t('cartBuy3Get1Applied')}
          </Card>
        )}

        {cart.items.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{item.courseCode}</p>
                <h2 className="mt-1 font-medium text-slate-900">{item.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{item.sellerLabel}</p>
              </div>
              <div className="text-right">
                <p className={cn('text-lg font-semibold', item.isFree ? 'text-emerald-600' : 'text-slate-900')}>
                  {item.isFree ? t('cartFree') : formatHkd(item.priceHkd)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-slate-500 hover:text-red-600"
                  onClick={() => handleRemove(item.id)}
                  disabled={removingId === item.id}
                >
                  {removingId === item.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="h-fit p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold text-slate-900">{t('cartOrderSummary')}</h2>
        <dl className="mt-4 space-y-3 text-sm text-slate-600">
          <div className="flex justify-between">
            <dt>{t('cartSubtotal')}</dt>
            <dd>{formatHkd(cart.subtotalHkd)}</dd>
          </div>
          {cart.discountHkd > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>{t('cartBuy3Get1Free')}</dt>
              <dd>-{formatHkd(cart.discountHkd)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
            <dt>{t('cartTotal')}</dt>
            <dd>{formatHkd(cart.totalHkd)}</dd>
          </div>
        </dl>

        <Button asChild className="mt-6 w-full bg-blue-600 hover:bg-blue-700">
          <Link href="/checkout">{t('cartCheckout')}</Link>
        </Button>
      </Card>
    </div>
  );
}
