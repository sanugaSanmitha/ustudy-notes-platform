import { adminClient } from '@/lib/supabase/admin';
import { clearCart } from '@/lib/cart/repository';

const PAYABLE_STATUSES = ['pending', 'payment_submitted'] as const;

export async function markOrderPaid(orderId: string, paymentIntentId: string | null = null) {
  const { data: order, error } = await adminClient
    .from('orders')
    .update({
      status: 'paid',
      stripe_payment_intent_id: paymentIntentId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .in('status', [...PAYABLE_STATUSES])
    .select('user_id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (order?.user_id) {
    await clearCart(order.user_id);
    await adminClient
      .from('users')
      .update({ is_first_purchase: false, updated_at: new Date().toISOString() })
      .eq('id', order.user_id)
      .eq('is_first_purchase', true);
  }

  return Boolean(order);
}

export function makePaymentReference(orderId: string) {
  return `UST${orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}
