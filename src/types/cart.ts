export type CartItem = {
  id: string;
  listingId: string;
  title: string;
  courseCode: string;
  priceHkd: number;
  addedAt: string;
  sellerLabel: string;
  isFree: boolean;
};

export type CartSummary = {
  items: CartItem[];
  itemCount: number;
  subtotalHkd: number;
  discountHkd: number;
  totalHkd: number;
  freeItemListingId: string | null;
  itemsUntilFree: number;
};

export type PaymentMethod = 'card' | 'stored_balance' | 'fps';
