import { NextResponse } from 'next/server';
import { getAuthIdentity } from '@/lib/auth/session';
import { jsonWithCartCount } from '@/lib/cart/cookie';
import { clearCart, getCartSummary } from '@/lib/cart/repository';

export const dynamic = 'force-dynamic';

function formatCartDbError(error: unknown) {
  const dbError = error as { code?: string; message?: string } | null;
  const message = dbError?.message?.toLowerCase() ?? '';

  if (message.includes('relation') && (message.includes('carts') || message.includes('cart_items'))) {
    return 'Cart tables are not ready. Run docs/migrations/026_cart_orders.sql in Supabase SQL Editor.';
  }

  return 'Failed to load cart.';
}

export async function GET() {
  try {
    const identity = await getAuthIdentity();
    if (!identity) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    const summary = await getCartSummary(identity.id);
    return jsonWithCartCount({ cart: summary }, summary);
  } catch (error) {
    console.error('Cart fetch error:', error);
    return NextResponse.json({ error: { code: 'FETCH_ERROR', message: formatCartDbError(error) } }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const identity = await getAuthIdentity();
    if (!identity) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    await clearCart(identity.id);
    const summary = await getCartSummary(identity.id);
    return jsonWithCartCount({ cart: summary }, summary);
  } catch (error) {
    console.error('Cart clear error:', error);
    return NextResponse.json({ error: { code: 'CLEAR_ERROR', message: formatCartDbError(error) } }, { status: 500 });
  }
}
