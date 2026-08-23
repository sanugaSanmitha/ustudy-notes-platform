-- Manual FPS checkout: unique bank reference + student submit, still locked until admin confirms.
-- Prerequisites: 026_cart_orders.sql

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'payment_submitted', 'paid', 'failed', 'cancelled'));

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('card', 'stored_balance', 'fps'));

alter table public.orders
  add column if not exists payment_reference text,
  add column if not exists fps_bank_reference text,
  add column if not exists payment_submitted_at timestamptz;

create unique index if not exists idx_orders_payment_reference
  on public.orders (payment_reference)
  where payment_reference is not null;

create index if not exists idx_orders_fps_queue
  on public.orders (status, payment_method, payment_submitted_at desc);
