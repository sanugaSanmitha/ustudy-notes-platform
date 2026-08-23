'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSellerNav } from '@/hooks/useSellerNav';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { cn } from '@/lib/utils';
import type { VariantProps } from 'class-variance-authority';
import { buttonVariants } from '@/components/ui/button';

type AddToCartButtonProps = {
  listingId: string;
  className?: string;
  onAdded?: () => void;
  redirectTo?: '/cart' | '/checkout';
  label?: string;
  size?: VariantProps<typeof buttonVariants>['size'];
  variant?: VariantProps<typeof buttonVariants>['variant'];
  iconOnly?: boolean;
};

export function AddToCartButton({
  listingId,
  className,
  onAdded,
  redirectTo,
  label,
  size,
  variant,
  iconOnly = false,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { t } = useLocale();
  const { setCartItemCount } = useSellerNav();
  const buttonLabel = label ?? t('addToCart');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });

      const payload = await response.json();

      if (response.status === 401) {
        const returnPath =
          redirectTo === '/checkout'
            ? `/notes/${listingId}?checkout=1`
            : `/notes/${listingId}`;
        router.push(`/login?next=${encodeURIComponent(returnPath)}`);
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error?.message || 'Failed to add to cart');
      }

      if (typeof payload.cart?.itemCount === 'number') {
        setCartItemCount(payload.cart.itemCount);
      }

      if (redirectTo) {
        router.push(redirectTo);
        return;
      }

      setMessage(payload.alreadyInCart ? 'Already in your cart' : 'Added to cart');
      onAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  if (iconOnly) {
    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={handleAdd}
          disabled={loading}
          aria-label={buttonLabel}
          title={message || error || buttonLabel}
          className={cn('inline-flex h-[35px] w-[78px] items-center justify-center disabled:opacity-60', className)}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin text-black" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/icons/cart-pill.svg" alt="" width={78} height={35} className="h-[35px] w-[78px]" />
          )}
        </button>
        {message ? <span className="sr-only">{message}</span> : null}
        {error ? <span className="sr-only">{error}</span> : null}
      </span>
    );
  }

  return (
    <>
      <Button
        type="button"
        className={className}
        size={size}
        variant={variant}
        onClick={handleAdd}
        disabled={loading}
      >
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShoppingCart className="mr-2 size-4" />}
        {buttonLabel}
      </Button>
      {message && <p className="mt-2 text-center text-xs text-emerald-600">{message}</p>}
      {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
    </>
  );
}
