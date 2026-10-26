-- FPS payment receipt upload (PDF / image) stored against the order.
-- Prerequisites: 030_fps_payments.sql

alter table public.orders
  add column if not exists receipt_storage_bucket text,
  add column if not exists receipt_storage_path text,
  add column if not exists receipt_filename text,
  add column if not exists receipt_content_type text,
  add column if not exists receipt_uploaded_at timestamptz;
