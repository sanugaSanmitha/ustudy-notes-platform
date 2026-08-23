'use client';

import { useCallback, useEffect, useState } from 'react';
import { Banknote, Loader2, RefreshCw } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { adminFetch } from '@/lib/api/admin-client';
import { formatHkd } from '@/lib/utils/cart-utils';
import { cn } from '@/lib/utils';

type FpsOrder = {
  id: string;
  status: 'pending' | 'payment_submitted';
  paymentReference: string | null;
  fpsBankReference: string | null;
  paymentSubmittedAt: string | null;
  totalHkd: number;
  createdAt: string;
  studentEmail: string;
  items: string[];
};

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<FpsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    const response = await fetch('/api/admin/payments', { credentials: 'same-origin' });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message || 'Failed to load payments.');
    }
    setOrders(payload.orders || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load payments.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const act = async (orderId: string, action: 'confirm' | 'reject') => {
    setActingId(orderId);
    setError('');
    try {
      const response = await adminFetch(`/api/admin/payments/${orderId}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || 'Action failed.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <AdminShell
      title="FPS payments"
      description="Confirm a transfer only after you see the matching amount and UST reference in your bank."
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          <RefreshCw className={cn('mr-2 size-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      }
    >
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">No pending FPS payments.</Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Bank ref</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-slate-900">{order.paymentReference || '—'}</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-500">{order.items.join(', ')}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{order.studentEmail}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatHkd(order.totalHkd)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{order.fpsBankReference || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                        order.status === 'payment_submitted'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {order.status === 'payment_submitted' ? 'Pending confirm' : 'Waiting for student'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={actingId === order.id}
                        onClick={() => act(order.id, 'confirm')}
                      >
                        <Banknote className="mr-1 size-3.5" />
                        Confirm
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={actingId === order.id}
                        onClick={() => act(order.id, 'reject')}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
