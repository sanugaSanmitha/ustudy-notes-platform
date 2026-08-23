-- Shopping cart and order tables for checkout flow.
-- Prerequisites: 001_auth_tables.sql, 016_note_listings.sql
--
-- If a previous partial run created cart/order tables with the wrong columns,
-- the drops below reset them. Safe when you have no cart/order data yet.

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'note_listings'
  ) then
    raise exception 'Missing public.note_listings. Run docs/migrations/016_note_listings.sql first.';
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  ) then
    raise exception 'Missing public.users. Run docs/migrations/001_auth_tables.sql first.';
  end if;
end $$;

drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.cart_items cascade;
drop table if exists public.carts cascade;

-- -----------------------------------------------------------------------------
-- carts (one per user)
-- -----------------------------------------------------------------------------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_carts_user_id on public.carts(user_id);

-- -----------------------------------------------------------------------------
-- cart_items
-- -----------------------------------------------------------------------------
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  listing_id uuid not null references public.note_listings(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (cart_id, listing_id)
);

create index if not exists idx_cart_items_cart_id on public.cart_items(cart_id);
create index if not exists idx_cart_items_listing_id on public.cart_items(listing_id);

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled')),
  payment_method text not null check (payment_method in ('card', 'stored_balance')),
  subtotal_hkd numeric(10, 2) not null check (subtotal_hkd >= 0),
  discount_hkd numeric(10, 2) not null default 0 check (discount_hkd >= 0),
  total_hkd numeric(10, 2) not null check (total_hkd >= 0),
  free_item_listing_id uuid references public.note_listings(id) on delete set null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_stripe_session on public.orders(stripe_checkout_session_id);

-- -----------------------------------------------------------------------------
-- order_items
-- -----------------------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  listing_id uuid not null references public.note_listings(id) on delete restrict,
  title text not null,
  course_code text not null,
  price_hkd numeric(10, 2) not null check (price_hkd >= 0),
  is_free boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_listing_id on public.order_items(listing_id);

-- -----------------------------------------------------------------------------
-- RLS (server-side API only)
-- -----------------------------------------------------------------------------
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users can read own carts" on public.carts;
create policy "Users can read own carts"
  on public.carts for select
  using (auth.uid() = user_id);

drop policy if exists "No direct client writes to carts" on public.carts;
create policy "No direct client writes to carts"
  on public.carts for all
  using (false);

drop policy if exists "Users can read own cart items" on public.cart_items;
create policy "Users can read own cart items"
  on public.cart_items for select
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "No direct client writes to cart items" on public.cart_items;
create policy "No direct client writes to cart items"
  on public.cart_items for all
  using (false);

drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

drop policy if exists "No direct client writes to orders" on public.orders;
create policy "No direct client writes to orders"
  on public.orders for all
  using (false);

drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "No direct client writes to order items" on public.order_items;
create policy "No direct client writes to order items"
  on public.order_items for all
  using (false);

grant select, insert, update, delete on table public.carts to service_role;
grant select, insert, update, delete on table public.cart_items to service_role;
grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.order_items to service_role;
