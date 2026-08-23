'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type BuyNowOnReturnProps = {
  listingId: string;
};

export function BuyNowOnReturn({ listingId }: BuyNowOnReturnProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (searchParams.get('checkout') !== '1' || started.current) {
      return;
    }

    started.current = true;

    const completeBuyNow = async () => {
      try {
        const response = await fetch('/api/cart/items', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId }),
        });

        if (!response.ok) {
          router.replace(`/notes/${listingId}`);
          return;
        }

        router.replace('/checkout');
      } catch {
        router.replace(`/notes/${listingId}`);
      }
    };

    void completeBuyNow();
  }, [listingId, router, searchParams]);

  return null;
}
