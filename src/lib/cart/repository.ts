import { adminClient } from '@/lib/supabase/admin';
import { buildCartSummary } from '@/lib/utils/cart-utils';
import type { CartSummary } from '@/types/cart';

type CartItemRow = {
  id: string;
  listing_id: string;
  added_at: string;
  note_listings:
    | {
        id: string;
        user_id: string;
        course_code: string;
        title: string;
        price_hkd: number;
        status: string;
      }
    | {
        id: string;
        user_id: string;
        course_code: string;
        title: string;
        price_hkd: number;
        status: string;
      }[]
    | null;
};

function normalizeListing(
  listing: NonNullable<CartItemRow['note_listings']> | null | undefined
) {
  if (!listing) {
    return null;
  }
  return Array.isArray(listing) ? listing[0] ?? null : listing;
}

async function getOrCreateCartId(userId: string) {
  const { data: existing, error: existingError } = await adminClient
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error: createError } = await adminClient
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return created.id;
}

async function enrichCartItems(rows: CartItemRow[]) {
  const sellerIds = Array.from(
    new Set(
      rows
        .map((row) => normalizeListing(row.note_listings)?.user_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const { data: sellers } = sellerIds.length
    ? await adminClient.from('users').select('id, anonymous_id').in('id', sellerIds)
    : { data: [] as { id: string; anonymous_id: string | null }[] };

  const sellerById = new Map(
    (sellers || []).map((seller) => [
      seller.id,
      seller.anonymous_id ? `Seller ${seller.anonymous_id}` : 'Verified Seller',
    ])
  );

  return rows
    .map((row) => {
      const listing = normalizeListing(row.note_listings);
      if (!listing || listing.status !== 'published') {
        return null;
      }
      return {
        id: row.id,
        listingId: listing.id,
        title: listing.title,
        courseCode: listing.course_code,
        priceHkd: Number(listing.price_hkd),
        addedAt: row.added_at,
        sellerLabel: sellerById.get(listing.user_id) || 'Verified Seller',
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export async function getCartSummary(userId: string): Promise<CartSummary> {
  const cartId = await getOrCreateCartId(userId);

  const { data, error } = await adminClient
    .from('cart_items')
    .select(
      'id, listing_id, added_at, note_listings(id, user_id, course_code, title, price_hkd, status)'
    )
    .eq('cart_id', cartId)
    .order('added_at', { ascending: true });

  if (error) {
    throw error;
  }

  const items = await enrichCartItems((data || []) as CartItemRow[]);
  return buildCartSummary(items);
}

export async function addListingToCart(userId: string, listingId: string) {
  const { data: listing, error: listingError } = await adminClient
    .from('note_listings')
    .select('id, user_id, status, price_hkd')
    .eq('id', listingId)
    .maybeSingle();

  if (listingError) {
    throw listingError;
  }

  if (!listing || listing.status !== 'published') {
    return { ok: false as const, code: 'LISTING_NOT_FOUND' as const };
  }

  if (listing.user_id === userId) {
    return { ok: false as const, code: 'OWN_LISTING' as const };
  }

  const cartId = await getOrCreateCartId(userId);

  const { data: existingItem } = await adminClient
    .from('cart_items')
    .select('id')
    .eq('cart_id', cartId)
    .eq('listing_id', listingId)
    .maybeSingle();

  if (existingItem) {
    return { ok: true as const, alreadyInCart: true as const, summary: await getCartSummary(userId) };
  }

  const { error: insertError } = await adminClient.from('cart_items').insert({
    cart_id: cartId,
    listing_id: listingId,
  });

  if (insertError) {
    throw insertError;
  }

  await adminClient.from('carts').update({ updated_at: new Date().toISOString() }).eq('id', cartId);

  return { ok: true as const, alreadyInCart: false as const, summary: await getCartSummary(userId) };
}

export async function removeCartItem(userId: string, cartItemId: string) {
  const cartId = await getOrCreateCartId(userId);

  const { error } = await adminClient
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)
    .eq('cart_id', cartId);

  if (error) {
    throw error;
  }

  return getCartSummary(userId);
}

export async function clearCart(userId: string) {
  const { data: cart } = await adminClient
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!cart?.id) {
    return;
  }

  await adminClient.from('cart_items').delete().eq('cart_id', cart.id);
}

export async function getCartIdForUser(userId: string) {
  return getOrCreateCartId(userId);
}
