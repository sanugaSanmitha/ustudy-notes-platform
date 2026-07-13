-- University course catalog (reference data for search, validation, and title enrichment).
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code text not null,
  course_title text not null,
  level text not null check (level in ('UG', 'PG')),
  created_at timestamptz not null default now(),
  unique (course_code, course_title)
);

create index if not exists idx_courses_course_code on public.courses (course_code);
create index if not exists idx_courses_level on public.courses (level);
create index if not exists idx_courses_code_title_search
  on public.courses using gin (
    to_tsvector('english', coalesce(course_code, '') || ' ' || coalesce(course_title, ''))
  );

alter table public.courses enable row level security;

drop policy if exists "Anyone can read courses" on public.courses;
create policy "Anyone can read courses"
  on public.courses for select
  using (true);

drop policy if exists "No direct client writes to courses" on public.courses;
create policy "No direct client writes to courses"
  on public.courses for all
  using (false);

grant select, insert, update, delete on table public.courses to service_role;
