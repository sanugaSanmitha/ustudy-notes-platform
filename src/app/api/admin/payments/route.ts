import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/grades/admin';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type OrderItemRow = { title: string; course_code: string };

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const { data, error } = await adminClient
    .from('orders')
    .select(
      'id, status, payment_method, payment_reference, fps_bank_reference, payment_submitted_at, total_hkd, created_at, user_id, order_items ( title, course_code )'
    )
    .eq('payment_method', 'fps')
    .in('status', ['pending', 'payment_submitted'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Admin FPS payments list error:', error);
    return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to load FPS payments.' } }, { status: 500 });
  }

  const rows = data || [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const { data: users } = userIds.length
    ? await adminClient.from('users').select('id, email').in('id', userIds)
    : { data: [] as { id: string; email: string }[] };
  const emailById = new Map((users || []).map((user) => [user.id, user.email]));

  const submitted = rows.filter((row) => row.status === 'payment_submitted');
  const waiting = rows.filter((row) => row.status === 'pending');
  const ordered = [...submitted, ...waiting];

  const orders = ordered.map((row) => {
    const items = (Array.isArray(row.order_items) ? row.order_items : []) as OrderItemRow[];
    return {
      id: row.id,
      status: row.status,
      paymentReference: row.payment_reference,
      fpsBankReference: row.fps_bank_reference,
      paymentSubmittedAt: row.payment_submitted_at,
      totalHkd: Number(row.total_hkd),
      createdAt: row.created_at,
      studentEmail: emailById.get(row.user_id) || 'Unknown student',
      items: items.map((item) => `${item.course_code} — ${item.title}`),
    };
  });

  return NextResponse.json({ orders });
}
