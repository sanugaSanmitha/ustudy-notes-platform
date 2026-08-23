'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatHkd } from '@/lib/utils/cart-utils';
import { cn } from '@/lib/utils';
import type { MessageKey } from '@/lib/i18n/messages';

type OrderRow = {
  id: string;
  status: string;
  paymentMethod: string;
  paymentReference: string | null;
  totalHkd: number;
  createdAt: string;
};

export default function OrdersPage() {
  const { t } = useLocale();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const statusLabel = (status: string) => {
    const map: Record<string, MessageKey> = {
      paid: 'ordersStatusPaid',
      payment_submitted: 'ordersStatusWaiting',
      pending: 'ordersStatusPending',
      cancelled: 'ordersStatusCancelled',
    };
    return map[status] ? t(map[status]) : status;
  };

  useEffect(() => {
    fetch('/api/orders', { credentials: 'same-origin' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error?.message || t('ordersLoadFailed'));
        }
        setOrders(payload.orders || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('ordersLoadFailed')))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">{t('ordersPageTitle')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('ordersPageSubtitle')}</p>

      {loading ? <Card className="mt-6 p-6 text-sm text-slate-500">{t('ordersLoading')}</Card> : null}
      {error ? <Card className="mt-6 border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card> : null}

      {!loading && !error && orders.length === 0 ? (
        <Card className="mt-6 p-6 text-sm text-slate-600">{t('ordersEmpty')}</Card>
      ) : null}

      <div className="mt-6 space-y-3">
        {orders.map((order) => (
          <Card key={order.id} className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-sm font-semibold text-slate-900">{order.paymentReference || order.id}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatHkd(order.totalHkd)} · {order.paymentMethod === 'fps' ? 'FPS' : order.paymentMethod}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    order.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.status === 'payment_submitted'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {statusLabel(order.status)}
                </span>
                {order.paymentMethod === 'fps' && (order.status === 'pending' || order.status === 'payment_submitted') ? (
                  <Link href={`/checkout/pay/${order.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                    {t('ordersContinuePayment')}
                  </Link>
                ) : null}
                {order.status === 'paid' ? (
                  <Link href="/profile/purchases" className="text-sm font-medium text-blue-600 hover:underline">
                    {t('ordersDownloads')}
                  </Link>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
