'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CartSummary } from '@/types/cart';

const CART_CACHE_TTL_MS = 15_000;

let cachedCart: CartSummary | null = null;
let cachedCartAt = 0;
let inFlightCartRequest: Promise<CartSummary | null> | null = null;

export function seedCartCache(cart: CartSummary | null) {
  cachedCart = cart;
  cachedCartAt = Date.now();
}

export function useCart(enabled = true, initialCart?: CartSummary | null) {
  const [cart, setCart] = useState<CartSummary | null>(() => {
    if (initialCart) {
      seedCartCache(initialCart);
      return initialCart;
    }
    if (cachedCartAt && Date.now() - cachedCartAt < CART_CACHE_TTL_MS) {
      return cachedCart;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (!enabled) return false;
    if (initialCart) return false;
    return !(cachedCartAt && Date.now() - cachedCartAt < CART_CACHE_TTL_MS);
  });
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (!enabled) {
      setCart(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (!force && cachedCartAt && Date.now() - cachedCartAt < CART_CACHE_TTL_MS) {
      setCart(cachedCart);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!inFlightCartRequest || force) {
        inFlightCartRequest = fetch('/api/cart', { credentials: 'same-origin' })
          .then(async (response) => {
            if (response.status === 401) {
              return null;
            }

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload.error?.message || 'Failed to load cart');
            }

            return payload.cart as CartSummary;
          })
          .finally(() => {
            inFlightCartRequest = null;
          });
      }

      const nextCart = await inFlightCartRequest;
      cachedCart = nextCart;
      cachedCartAt = Date.now();
      setCart(nextCart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (initialCart) {
      seedCartCache(initialCart);
      return;
    }
    void refresh();
  }, [initialCart, refresh]);

  return { cart, loading, error, refresh, itemCount: cart?.itemCount ?? 0 };
}
