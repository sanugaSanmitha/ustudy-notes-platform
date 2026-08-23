'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/i18n/LocaleProvider';

export function PurchaseDownloadButton({
  listingId,
  label,
}: {
  listingId: string;
  label?: string;
}) {
  const { t } = useLocale();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      const response = await fetch(`/api/notes/${listingId}/download`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || t('purchaseDownloadFailed'));
      }
      if (payload.downloadUrl) {
        window.location.href = payload.downloadUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('purchaseDownloadFailed'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <Button type="button" className="w-full bg-[#1f2f66] hover:bg-[#18244f]" onClick={download} disabled={downloading}>
        {downloading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t('purchasePreparingDownload')}
          </>
        ) : (
          label || t('purchaseDownloadAnytime')
        )}
      </Button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function ListingPurchasePanel({
  listingId,
  buySlot,
  initialOwned,
}: {
  listingId: string;
  buySlot: ReactNode;
  initialOwned?: boolean;
}) {
  const { t } = useLocale();
  const [state, setState] = useState<'loading' | 'owned' | 'buy'>(
    initialOwned === true ? 'owned' : initialOwned === false ? 'buy' : 'loading'
  );

  useEffect(() => {
    if (initialOwned !== undefined) {
      setState(initialOwned ? 'owned' : 'buy');
      return;
    }

    let cancelled = false;
    fetch('/api/purchases', { credentials: 'same-origin' })
      .then(async (response) => {
        if (response.status === 401) {
          return { items: [] as Array<{ listingId: string }> };
        }
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const owned = Array.isArray(payload.items)
          ? payload.items.some((item: { listingId: string }) => item.listingId === listingId)
          : false;
        setState(owned ? 'owned' : 'buy');
      })
      .catch(() => {
        if (!cancelled) setState('buy');
      });
    return () => {
      cancelled = true;
    };
  }, [listingId, initialOwned]);

  if (state === 'loading') {
    return <div className="mt-6 h-10 animate-pulse rounded-md bg-slate-100" />;
  }

  if (state === 'owned') {
    return (
      <div className="mt-6 space-y-2">
        <p className="text-center text-sm font-medium text-emerald-700">{t('purchaseUnlockedBody')}</p>
        <PurchaseDownloadButton listingId={listingId} />
      </div>
    );
  }

  return <>{buySlot}</>;
}
