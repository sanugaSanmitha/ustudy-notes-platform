import type { CartItem, CartSummary } from '@/types/cart';

type PricedCartEntry = {
  listingId: string;
  priceHkd: number;
  addedAt: string;
};

export function calculateFreeItemDiscount(items: PricedCartEntry[]) {
  if (items.length < 3) {
    return {
      freeItemListingId: null as string | null,
      discountHkd: 0,
      itemsUntilFree: 3 - items.length,
    };
  }

  const sorted = [...items].sort((a, b) => {
    if (a.priceHkd !== b.priceHkd) {
      return a.priceHkd - b.priceHkd;
    }
    return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
  });

  const freeItem = sorted[0];
  return {
    freeItemListingId: freeItem.listingId,
    discountHkd: freeItem.priceHkd,
    itemsUntilFree: 0,
  };
}

export function buildCartSummary(
  items: Omit<CartItem, 'isFree'>[]
): CartSummary {
  const { freeItemListingId, discountHkd, itemsUntilFree } = calculateFreeItemDiscount(
    items.map((item) => ({
      listingId: item.listingId,
      priceHkd: item.priceHkd,
      addedAt: item.addedAt,
    }))
  );

  const subtotalHkd = items.reduce((sum, item) => sum + item.priceHkd, 0);
  const enrichedItems: CartItem[] = items.map((item) => ({
    ...item,
    isFree: freeItemListingId === item.listingId,
  }));

  return {
    items: enrichedItems,
    itemCount: items.length,
    subtotalHkd,
    discountHkd,
    totalHkd: Math.max(0, subtotalHkd - discountHkd),
    freeItemListingId,
    itemsUntilFree,
  };
}

export function formatHkd(amount: number) {
  return `HK$${amount.toFixed(0)}`;
}
