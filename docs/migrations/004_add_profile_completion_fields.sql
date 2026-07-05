-- Add onboarding profile completion fields to users table.
alter table public.users
  add column if not exists full_name text,
  add column if not exists school text,
  add column if not exists profile_completed boolean not null default false;

-- Ensure existing rows are marked complete only when required data already exists.
update public.users
set profile_completed = (coalesce(trim(full_name), '') <> '' and coalesce(trim(school), '') <> '');
