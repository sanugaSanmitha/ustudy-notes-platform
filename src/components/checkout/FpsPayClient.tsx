'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatHkd } from '@/lib/utils/cart-utils';
import type { BuyerOrder } from '@/lib/orders/repository';
import type { FpsConfig } from '@/lib/payments/fps';

type FpsPayClientProps = {
  order: BuyerOrder;
  fps: FpsConfig;
  qrDataUrl?: string | null;
};

export function FpsPayClient({ order, fps, qrDataUrl = null }: FpsPayClientProps) {
  const { t } = useLocale();
  const alreadySubmitted = order.status === 'payment_submitted';
  const [bankReference, setBankReference] = useState(order.fpsBankReference || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'id' | 'ref' | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const qrSrc = qrDataUrl || fps.qrImageUrl;
  const amountLabel = formatHkd(order.totalHkd);

  const copy = async (value: string, key: 'id' | 'ref') => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/orders/${order.id}/fps-submit`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fpsBankReference: bankReference.trim() || undefined }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || t('fpsSubmitFailed'));
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('fpsSubmitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="mx-auto max-w-lg px-6 py-10 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50">
          <CheckCircle2 className="size-7 text-amber-600" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">{t('fpsPaymentSubmitted')}</h1>
        <p className="mt-3 text-sm text-slate-600">
          {t('fpsPaymentSubmittedBody')
            .replace('{amount}', amountLabel)
            .replace('{reference}', order.paymentReference)}
        </p>
        <p className="mt-2 text-sm text-slate-500">{t('fpsPaymentSubmittedHint')}</p>
        <Button asChild className="mt-8 bg-[#1f2f66] hover:bg-[#18244f]">
          <Link href="/profile/orders">{t('fpsViewOrderStatus')}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t('fpsPayTitle')}</h1>
        <p className="mt-2 text-slate-600">
          {t('fpsPaySubtitle')
            .replace('{amount}', amountLabel)
            .replace('{reference}', order.paymentReference)}
        </p>
      </div>

      <Card className="p-5">
        <p className="text-sm font-medium text-slate-500">{t('fpsAmount')}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{amountLabel}</p>
        <ul className="mt-4 space-y-1 text-sm text-slate-600">
          {order.items.map((item) => (
            <li key={`${item.courseCode}-${item.title}`}>
              {item.courseCode} — {item.title}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold text-slate-900">{t('fpsScanBankingApp')}</p>
        {qrSrc && !qrFailed ? (
          <div className="mx-auto w-fit rounded-xl border border-slate-200 bg-white p-3">
            <img
              src={qrSrc}
              alt={t('fpsQrAlt')}
              width={220}
              height={220}
              className="size-[220px] object-contain"
              onError={() => setQrFailed(true)}
            />
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{t('fpsQrFailed')}</p>
        )}
        <p className="text-center text-xs text-slate-500">
          {t('fpsScanHint')
            .replace('{amount}', amountLabel)
            .replace('{reference}', order.paymentReference)}
        </p>

        {fps.fpsNumber ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('fpsNumber')}</p>
            <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="font-mono text-sm text-slate-900">{fps.fpsNumber}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => copy(fps.fpsNumber, 'id')}>
                <Copy className="mr-1 size-3.5" />
                {copied === 'id' ? t('fpsCopied') : t('fpsCopy')}
              </Button>
            </div>
            <p className="mt-1 text-xs text-slate-500">{t('fpsPayTo').replace('{name}', fps.accountName)}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">{t('fpsPayTo').replace('{name}', fps.accountName)}</p>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('fpsPaymentReference')}</p>
          <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2">
            <span className="font-mono text-sm font-semibold text-amber-950">{order.paymentReference}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => copy(order.paymentReference, 'ref')}>
              <Copy className="mr-1 size-3.5" />
              {copied === 'ref' ? t('fpsCopied') : t('fpsCopy')}
            </Button>
          </div>
          <p className="mt-1 text-xs text-slate-500">{t('fpsReferenceHint')}</p>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <Label htmlFor="fps-ref">{t('fpsBankRefLabel')}</Label>
          <Input
            id="fps-ref"
            className="mt-1"
            value={bankReference}
            onChange={(event) => setBankReference(event.target.value)}
            placeholder={t('fpsBankRefPlaceholder')}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="button" className="w-full bg-[#1f2f66] hover:bg-[#18244f]" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t('fpsSubmitting')}
            </>
          ) : (
            t('fpsCompletedPayment')
          )}
        </Button>
        <p className="text-xs text-slate-500">{t('fpsUnlockHint').replace('{amount}', amountLabel)}</p>
      </Card>
    </div>
  );
}
