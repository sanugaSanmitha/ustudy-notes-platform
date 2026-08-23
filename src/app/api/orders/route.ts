import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getCartSummary } from '@/lib/cart/repository';
import { makePaymentReference, markOrderPaid } from '@/lib/orders/fulfill';
import type { PaymentMethod } from '@/types/cart';

export const dynamic = 'force-dynamic';

const createOrderSchema = z.object({
  paymentMethod: z.enum(['fps']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid request' } },
        { status: 400 }
      );
    }

    const paymentMethod: PaymentMethod = 'fps';

    const summary = await getCartSummary(user.id);

    if (summary.items.length === 0) {
      return NextResponse.json({ error: { code: 'EMPTY_CART', message: 'Your cart is empty.' } }, { status: 400 });
    }

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        payment_method: paymentMethod,
        subtotal_hkd: summary.subtotalHkd,
        discount_hkd: summary.discountHkd,
        total_hkd: summary.totalHkd,
        free_item_listing_id: summary.freeItemListingId,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('Order create error:', orderError);
      return NextResponse.json({ error: { code: 'ORDER_CREATE_ERROR', message: 'Failed to create order.' } }, { status: 500 });
    }

    const paymentReference = makePaymentReference(order.id);

    const orderItems = summary.items.map((item) => ({
      order_id: order.id,
      listing_id: item.listingId,
      title: item.title,
      course_code: item.courseCode,
      price_hkd: item.priceHkd,
      is_free: item.isFree,
    }));

    const { error: itemsError } = await adminClient.from('order_items').insert(orderItems);

    if (itemsError) {
      console.error('Order items create error:', itemsError);
      await adminClient.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: { code: 'ORDER_CREATE_ERROR', message: 'Failed to create order items.' } }, { status: 500 });
    }

    await adminClient
      .from('orders')
      .update({
        payment_reference: paymentReference,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (summary.totalHkd <= 0) {
      await markOrderPaid(order.id);
      return NextResponse.json({
        orderId: order.id,
        paymentReference,
        payUrl: `/profile/purchases`,
      });
    }

    return NextResponse.json({
      orderId: order.id,
      paymentReference,
      payUrl: `/checkout/pay/${order.id}`,
    });
  } catch (error) {
    console.error('Checkout create error:', error);
    return NextResponse.json({ error: { code: 'CHECKOUT_ERROR', message: 'Failed to start checkout.' } }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    const { data, error } = await adminClient
      .from('orders')
      .select(
        'id, status, payment_method, payment_reference, subtotal_hkd, discount_hkd, total_hkd, paid_at, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Orders fetch error:', error);
      return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to load orders.' } }, { status: 500 });
    }

    return NextResponse.json({
      orders: (data || []).map((row) => ({
        id: row.id,
        status: row.status,
        paymentMethod: row.payment_method,
        paymentReference: row.payment_reference,
        subtotalHkd: Number(row.subtotal_hkd),
        discountHkd: Number(row.discount_hkd),
        totalHkd: Number(row.total_hkd),
        paidAt: row.paid_at,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Orders list error:', error);
    return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to load orders.' } }, { status: 500 });
  }
}
