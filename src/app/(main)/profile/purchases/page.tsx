import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PurchaseDownloadButton } from '@/components/notes/ListingPurchasePanel';
import { getAuthIdentity } from '@/lib/auth/session';
import { getPaidPurchasesForUser } from '@/lib/orders/access';
import { formatHkd } from '@/lib/utils/cart-utils';

export default async function PurchasesPage() {
  const identity = await getAuthIdentity();
  if (!identity) {
    redirect('/login?next=/profile/purchases');
  }

  let items: Awaited<ReturnType<typeof getPaidPurchasesForUser>> = [];
  let error = '';
  try {
    items = await getPaidPurchasesForUser(identity.id);
  } catch {
    error = 'Failed to load purchases.';
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Purchases</h1>
      <p className="mt-2 text-sm text-slate-600">
        After payment is confirmed, the full note stays unlocked here. Download the zip anytime.
      </p>

      {error ? <Card className="mt-6 border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card> : null}

      {!error && items.length === 0 ? (
        <Card className="mt-6 p-6 text-sm text-slate-600">
          No confirmed purchases yet.{' '}
          <Link href="/courses" className="font-medium text-blue-600 hover:underline">
            Browse courses
          </Link>
        </Card>
      ) : null}

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-600">{item.courseCode}</p>
                <p className="mt-1 text-lg font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatHkd(item.priceHkd)}
                  {item.paymentReference ? ` · ${item.paymentReference}` : ''}
                  {item.fileCount ? ` · ${item.fileCount} files unlocked` : ''}
                </p>
                {item.fileNames.length > 0 ? (
                  <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                    {item.fileNames.slice(0, 12).map((fileName) => (
                      <li key={fileName} className="flex items-center gap-2 text-sm text-emerald-900">
                        <FileText className="size-4 shrink-0 text-emerald-600" />
                        <span className="truncate">{fileName}</span>
                      </li>
                    ))}
                    {item.fileNames.length > 12 ? (
                      <li className="text-xs text-emerald-700">+{item.fileNames.length - 12} more files in the zip</li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
              <div className="sm:w-56">
                <PurchaseDownloadButton listingId={item.listingId} />
                <Link
                  href={`/notes/${item.listingId}`}
                  className="mt-2 block text-center text-sm font-medium text-blue-600 hover:underline"
                >
                  Open note
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
