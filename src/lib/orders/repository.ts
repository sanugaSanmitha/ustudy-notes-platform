import { adminClient } from '@/lib/supabase/admin';

export type BuyerOrder = {
  id: string;
  status: string;
  paymentMethod: string;
  paymentReference: string;
  fpsBankReference: string | null;
  totalHkd: number;
  receiptFilename: string | null;
  receiptUploadedAt: string | null;
  items: Array<{ listingId: string; title: string; courseCode: string }>;
};

export async function getBuyerFpsOrder(userId: string, orderId: string): Promise<BuyerOrder | null> {
  const { data, error } = await adminClient
    .from('orders')
    .select(
      'id, status, payment_method, payment_reference, fps_bank_reference, total_hkd, receipt_filename, receipt_uploaded_at, order_items ( listing_id, title, course_code )'
    )
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const items = (Array.isArray(data.order_items) ? data.order_items : []) as Array<{
    listing_id: string;
    title: string;
    course_code: string;
  }>;

  return {
    id: data.id,
    status: data.status,
    paymentMethod: data.payment_method,
    paymentReference: data.payment_reference || makeFallbackReference(data.id),
    fpsBankReference: data.fps_bank_reference,
    totalHkd: Number(data.total_hkd),
    receiptFilename: data.receipt_filename || null,
    receiptUploadedAt: data.receipt_uploaded_at || null,
    items: items.map((item) => ({
      listingId: item.listing_id,
      title: item.title,
      courseCode: item.course_code,
    })),
  };
}

function makeFallbackReference(orderId: string) {
  return `UST${orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}
