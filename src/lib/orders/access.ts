import { adminClient } from '@/lib/supabase/admin';

export type PaidPurchase = {
  id: string;
  listingId: string;
  title: string;
  courseCode: string;
  priceHkd: number;
  paymentReference: string | null;
  paidAt: string | null;
  zipFilename: string | null;
  fileNames: string[];
  fileCount: number;
};

export async function userHasPaidListing(userId: string, listingId: string) {
  const { data, error } = await adminClient
    .from('order_items')
    .select('id, orders!inner(user_id, status)')
    .eq('listing_id', listingId)
    .eq('orders.user_id', userId)
    .eq('orders.status', 'paid')
    .limit(1);

  if (error) {
    console.error('Paid listing check error:', error);
    return false;
  }

  return Boolean(data && data.length > 0);
}

export async function getPaidPurchasesForUser(userId: string): Promise<PaidPurchase[]> {
  const { data, error } = await adminClient
    .from('order_items')
    .select(
      'id, listing_id, title, course_code, price_hkd, orders!inner ( id, status, paid_at, user_id, payment_reference ), note_listings ( zip_filename, file_names, file_count )'
    )
    .eq('orders.user_id', userId)
    .eq('orders.status', 'paid')
    .order('id', { ascending: false });

  if (error) {
    console.error('Paid purchases fetch error:', error);
    const fallback = await adminClient
      .from('order_items')
      .select(
        'id, listing_id, title, course_code, price_hkd, orders!inner ( id, status, paid_at, user_id, payment_reference )'
      )
      .eq('orders.user_id', userId)
      .eq('orders.status', 'paid')
      .order('id', { ascending: false });

    if (fallback.error) {
      throw fallback.error;
    }

    return (fallback.data || []).map((row) => {
      const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
      return {
        id: row.id,
        listingId: row.listing_id,
        title: row.title,
        courseCode: row.course_code,
        priceHkd: Number(row.price_hkd),
        paymentReference: order?.payment_reference || null,
        paidAt: order?.paid_at || null,
        zipFilename: null,
        fileNames: [],
        fileCount: 0,
      };
    });
  }

  return (data || []).map((row) => {
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    const listing = Array.isArray(row.note_listings) ? row.note_listings[0] : row.note_listings;
    const fileNames = Array.isArray(listing?.file_names) ? (listing.file_names as string[]) : [];

    return {
      id: row.id,
      listingId: row.listing_id,
      title: row.title,
      courseCode: row.course_code,
      priceHkd: Number(row.price_hkd),
      paymentReference: order?.payment_reference || null,
      paidAt: order?.paid_at || null,
      zipFilename: listing?.zip_filename || null,
      fileNames,
      fileCount: Number(listing?.file_count) || fileNames.length,
    };
  });
}
