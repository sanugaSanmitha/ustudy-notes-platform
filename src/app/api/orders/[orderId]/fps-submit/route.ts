import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { enforceRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

const submitSchema = z.object({
  fpsBankReference: z.string().trim().max(80).optional(),
});

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

  const { success: submitLimitOk } = await enforceRateLimit(`fps-submit:${user.id}`, 10, '1 h');
  if (!submitLimitOk) {
    return rateLimitResponse('Too many payment submissions. Try again later.');
  }

  const body = await request.json().catch(() => ({}));
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payment reference.' } }, { status: 400 });
  }

  const { data: order, error } = await adminClient
    .from('orders')
    .update({
      status: 'payment_submitted',
      fps_bank_reference: parsed.data.fpsBankReference || null,
      payment_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.orderId)
    .eq('user_id', user.id)
    .eq('payment_method', 'fps')
    .in('status', ['pending', 'payment_submitted'])
    .select('id, status, payment_reference')
    .maybeSingle();

  if (error) {
    console.error('FPS submit error:', error);
    return NextResponse.json({ error: { code: 'SUBMIT_ERROR', message: 'Failed to record payment.' } }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Order not found or already processed.' } }, { status: 404 });
  }

  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    paymentReference: order.payment_reference,
  });
}
