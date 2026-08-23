import { redirect, notFound } from 'next/navigation';
import { getAuthIdentity } from '@/lib/auth/session';
import { getBuyerFpsOrder } from '@/lib/orders/repository';
import { getFpsConfig } from '@/lib/payments/fps';
import { createFpsQrDataUrl } from '@/lib/payments/fps-qr';
import { FpsPayClient } from '@/components/checkout/FpsPayClient';

type PageProps = {
  params: { orderId: string };
};

export default async function FpsPayPage({ params }: PageProps) {
  const identity = await getAuthIdentity();
  if (!identity) {
    redirect(`/login?next=/checkout/pay/${params.orderId}`);
  }

  const order = await getBuyerFpsOrder(identity.id, params.orderId);
  if (!order || order.paymentMethod !== 'fps') {
    notFound();
  }

  if (order.status === 'paid') {
    redirect('/profile/purchases');
  }

  if (order.status === 'cancelled' || order.status === 'failed') {
    redirect('/checkout?cancelled=1');
  }

  const fps = getFpsConfig();
  const qrDataUrl = fps.qrImageUrl ? null : await createFpsQrDataUrl(fps, order.totalHkd, order.paymentReference);

  return (
    <div className="px-4 py-10">
      <FpsPayClient order={order} fps={fps} qrDataUrl={qrDataUrl} />
    </div>
  );
}
