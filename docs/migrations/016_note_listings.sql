-- Note listing submissions from verified sellers.
create table if not exists public.note_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_code text not null,
  title text not null,
  description text,
  professor text,
  academic_year text not null,
  semester text not null,
  language text not null default 'English',
  price_hkd numeric(10,2) not null check (price_hkd >= 0),
  zip_filename text not null,
  zip_size_bytes bigint not null check (zip_size_bytes > 0),
  zip_storage_bucket text,
  zip_storage_path text,
  file_names jsonb not null default '[]'::jsonb,
  file_count integer not null default 0 check (file_count >= 0),
  status text not null default 'pending_review' check (status in ('pending_review', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_note_listings_user_id on public.note_listings(user_id);
create index if not exists idx_note_listings_course_code on public.note_listings(course_code);
create index if not exists idx_note_listings_status on public.note_listings(status);

alter table public.note_listings enable row level security;

drop policy if exists "Users can read own note listings" on public.note_listings;
create policy "Users can read own note listings"
  on public.note_listings for select
  using (auth.uid() = user_id);

drop policy if exists "No direct client writes to note listings" on public.note_listings;
create policy "No direct client writes to note listings"
  on public.note_listings for all
  using (false);

grant select, insert, update, delete on table public.note_listings to service_role;
