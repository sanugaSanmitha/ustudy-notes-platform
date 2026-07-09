-- Download tracking and ZIP preview metadata for course materials.

alter table public.course_materials
  add column if not exists zip_file_names jsonb not null default '[]'::jsonb,
  add column if not exists download_count integer not null default 0 check (download_count >= 0);

create table if not exists public.material_downloads (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.course_materials(id) on delete cascade,
  downloaded_by uuid references public.users(id) on delete set null,
  downloaded_at timestamptz not null default now(),
  source text not null default 'student' check (source in ('student', 'admin', 'staff'))
);

create index if not exists idx_material_downloads_material_id
  on public.material_downloads(material_id, downloaded_at desc);

alter table public.material_downloads enable row level security;

drop policy if exists "No direct client writes to material downloads" on public.material_downloads;
create policy "No direct client writes to material downloads"
  on public.material_downloads for all
  using (false);

drop policy if exists "Staff can read material downloads" on public.material_downloads;
create policy "Staff can read material downloads"
  on public.material_downloads for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('admin', 'support', 'assistant')
    )
  );

grant select, insert, update, delete
  on table public.material_downloads
  to service_role;
