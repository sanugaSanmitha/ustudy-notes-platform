-- UStudy Notes Platform
-- One-shot auth bootstrap for Supabase SQL Editor.
-- Safe to run multiple times (idempotent).

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  anonymous_id text unique generated always as (
    upper(substr(md5(id::text), 1, 6))
  ) stored,
  full_name text,
  school text,
  profile_completed boolean not null default false,
  is_seller boolean not null default false,
  is_first_purchase boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add column if not exists full_name text,
  add column if not exists school text,
  add column if not exists profile_completed boolean not null default false;

update public.users
set profile_completed = (
  coalesce(trim(full_name), '') <> ''
  and coalesce(trim(school), '') <> ''
);

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_anonymous_id on public.users(anonymous_id);

-- -----------------------------------------------------------------------------
-- verification_tokens
-- -----------------------------------------------------------------------------
create table if not exists public.verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_verification_tokens_token_hash
  on public.verification_tokens(token_hash);

create index if not exists idx_verification_tokens_user_id
  on public.verification_tokens(user_id);

-- -----------------------------------------------------------------------------
-- password_reset_tokens
-- -----------------------------------------------------------------------------
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_tokens_token_hash
  on public.password_reset_tokens(token_hash);

create index if not exists idx_password_reset_tokens_user_id
  on public.password_reset_tokens(user_id);

-- -----------------------------------------------------------------------------
-- RLS + policies
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.verification_tokens enable row level security;
alter table public.password_reset_tokens enable row level security;

drop policy if exists "Users can read own data" on public.users;
create policy "Users can read own data"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users can update own data" on public.users;
create policy "Users can update own data"
  on public.users for update
  using (auth.uid() = id);

drop policy if exists "No direct client access to tokens" on public.verification_tokens;
create policy "No direct client access to tokens"
  on public.verification_tokens for all
  using (false);

drop policy if exists "No direct client access to password reset tokens" on public.password_reset_tokens;
create policy "No direct client access to password reset tokens"
  on public.password_reset_tokens for all
  using (false);

-- -----------------------------------------------------------------------------
-- Grants for API routes using service role
-- -----------------------------------------------------------------------------
grant usage on schema public to service_role;
grant usage on schema public to authenticated;

grant select, insert, update, delete
  on table public.users
  to service_role;

grant select, insert, update, delete
  on table public.verification_tokens
  to service_role;

grant select, insert, update, delete
  on table public.password_reset_tokens
  to service_role;

grant select, update
  on table public.users
  to authenticated;
