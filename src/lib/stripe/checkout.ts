import type { CartSummary } from '@/types/cart';
import { getStripe } from '@/lib/stripe/client';

type CreateCheckoutSessionInput = {
  orderId: string;
  userId: string;
  userEmail: string;
  summary: CartSummary;
  successUrl: string;
  cancelUrl: string;
};

export async function createStripeCheckoutSession(input: CreateCheckoutSessionInput) {
  const stripe = getStripe();

  const lineItems = input.summary.items.map((item) => ({
    price_data: {
      currency: 'hkd',
      product_data: {
        name: item.isFree
          ? `${item.courseCode} — ${item.title} (free)`
          : `${item.courseCode} — ${item.title}`,
        metadata: {
          listing_id: item.listingId,
          order_id: input.orderId,
        },
      },
      unit_amount: item.isFree ? 0 : Math.round(item.priceHkd * 100),
    },
    quantity: 1,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: input.userEmail,
    line_items: lineItems,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      order_id: input.orderId,
      user_id: input.userId,
    },
    payment_method_types: ['card'],
  });

  return session;
}
