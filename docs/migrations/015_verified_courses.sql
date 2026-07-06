-- Verified courses unlocked after transcript approval.
create table if not exists public.verified_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  verification_id uuid references public.grade_verifications(id) on delete set null,
  course_code text not null,
  course_name text,
  grade text not null,
  academic_year text,
  semester text,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_code)
);

create index if not exists idx_verified_courses_user_id
  on public.verified_courses(user_id);

create index if not exists idx_verified_courses_verification_id
  on public.verified_courses(verification_id);

alter table public.verified_courses enable row level security;

drop policy if exists "Users can read own verified courses" on public.verified_courses;
create policy "Users can read own verified courses"
  on public.verified_courses for select
  using (auth.uid() = user_id);

drop policy if exists "No direct client writes to verified courses" on public.verified_courses;
create policy "No direct client writes to verified courses"
  on public.verified_courses for all
  using (false);

grant select, insert, update, delete
  on table public.verified_courses
  to service_role;
