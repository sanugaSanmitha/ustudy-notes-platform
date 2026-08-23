import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminUser } from '@/lib/grades/admin';
import { adminClient } from '@/lib/supabase/admin';
import { markOrderPaid } from '@/lib/orders/fulfill';
import { ADMIN_CSRF_HEADER, ADMIN_CSRF_VALUE } from '@/lib/api/admin-client';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  action: z.enum(['confirm', 'reject']),
});

type RouteContext = { params: { orderId: string } };

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  if (request.headers.get(ADMIN_CSRF_HEADER) !== ADMIN_CSRF_VALUE) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid request.' } }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid action.' } }, { status: 400 });
  }

  if (parsed.data.action === 'confirm') {
    const updated = await markOrderPaid(params.orderId);
    if (!updated) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Order not found or already processed.' } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, status: 'paid' });
  }

  const { data, error } = await adminClient
    .from('orders')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.orderId)
    .in('status', ['pending', 'payment_submitted'])
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('FPS reject error:', error);
    return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: 'Failed to reject order.' } }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Order not found or already processed.' } }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status: 'cancelled' });
}
