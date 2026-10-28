import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { uploadOrderReceipt } from '@/lib/payments/receipt-storage';
import { enforceRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { orderId: string } };

export async function POST(request: Request, { params }: RouteContext) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
  }

  const { success: receiptLimitOk } = await enforceRateLimit(`order-receipt:${user.id}`, 10, '1 h');
  if (!receiptLimitOk) {
    return rateLimitResponse('Too many receipt uploads. Try again later.');
  }

  const { data: order, error: orderError } = await adminClient
    .from('orders')
    .select('id, status, payment_method')
    .eq('id', params.orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Order not found.' } }, { status: 404 });
  }

  if (order.payment_method !== 'fps') {
    return NextResponse.json({ error: { code: 'INVALID_METHOD', message: 'Receipts are only for FPS orders.' } }, { status: 400 });
  }

  if (!['pending', 'payment_submitted'].includes(order.status)) {
    return NextResponse.json({ error: { code: 'INVALID_STATUS', message: 'This order can no longer accept a receipt.' } }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Please choose a receipt file.' } }, { status: 400 });
  }

  try {
    const receipt = await uploadOrderReceipt({
      userId: user.id,
      orderId: params.orderId,
      file,
    });
    return NextResponse.json({ receipt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload receipt.';
    return NextResponse.json({ error: { code: 'UPLOAD_ERROR', message } }, { status: 400 });
  }
}
