-- UStudy Notes Platform — Auth tables (Phase 1)
-- Run in Supabase Dashboard → SQL Editor

create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  anonymous_id text unique generated always as (
    upper(substr(md5(id::text), 1, 6))
  ) stored,
  is_seller boolean not null default false,
  is_first_purchase boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_anonymous_id on public.users(anonymous_id);

create table if not exists public.verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_verification_tokens_token_hash on public.verification_tokens(token_hash);
create index if not exists idx_verification_tokens_user_id on public.verification_tokens(user_id);

alter table public.users enable row level security;
alter table public.verification_tokens enable row level security;

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

grant usage on schema public to service_role;

grant select, insert, update, delete
  on table public.users
  to service_role;

grant select, insert, update, delete
  on table public.verification_tokens
  to service_role;
