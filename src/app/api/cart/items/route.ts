import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthIdentity } from '@/lib/auth/session';
import { jsonWithCartCount } from '@/lib/cart/cookie';
import { addListingToCart } from '@/lib/cart/repository';

export const dynamic = 'force-dynamic';

const addItemSchema = z.object({
  listingId: z.string().uuid('Invalid listing id'),
});

export async function POST(request: NextRequest) {
  try {
    const identity = await getAuthIdentity();
    if (!identity) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid request' } },
        { status: 400 }
      );
    }

    const result = await addListingToCart(identity.id, parsed.data.listingId);

    if (!result.ok) {
      const message =
        result.code === 'OWN_LISTING'
          ? 'You cannot add your own notes to the cart.'
          : 'This note is not available for purchase.';
      return NextResponse.json({ error: { code: result.code, message } }, { status: 400 });
    }

    return jsonWithCartCount(
      {
        cart: result.summary,
        alreadyInCart: result.alreadyInCart,
      },
      result.summary
    );
  } catch (error) {
    console.error('Cart add error:', error);
    return NextResponse.json({ error: { code: 'ADD_ERROR', message: 'Failed to add item to cart.' } }, { status: 500 });
  }
}
