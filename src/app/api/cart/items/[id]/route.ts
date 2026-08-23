import { NextResponse } from 'next/server';
import { getAuthIdentity } from '@/lib/auth/session';
import { jsonWithCartCount } from '@/lib/cart/cookie';
import { removeCartItem } from '@/lib/cart/repository';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: { id: string };
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const identity = await getAuthIdentity();
    if (!identity) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    const summary = await removeCartItem(identity.id, params.id);
    return jsonWithCartCount({ cart: summary }, summary);
  } catch (error) {
    console.error('Cart remove error:', error);
    return NextResponse.json({ error: { code: 'REMOVE_ERROR', message: 'Failed to remove cart item.' } }, { status: 500 });
  }
}
