-- Course materials uploaded by verified sellers after grade approval.

create table if not exists public.course_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  verification_id uuid not null references public.grade_verifications(id) on delete cascade,
  course_code text not null,
  course_name text not null,
  grade text not null,
  zip_filename text not null,
  zip_size_bytes bigint not null check (zip_size_bytes > 0),
  zip_storage_bucket text,
  zip_storage_path text,
  uploaded_at timestamptz not null default now(),
  locked_at timestamptz,
  is_locked boolean not null default false,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (verification_id, course_code)
);

create table if not exists public.material_upload_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  verification_id uuid not null references public.grade_verifications(id) on delete cascade,
  course_code text not null,
  attempt_number integer not null check (attempt_number >= 1),
  uploaded_at timestamptz not null default now(),
  success boolean not null default false,
  error_message text,
  zip_storage_bucket text,
  zip_storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_materials_user_id
  on public.course_materials(user_id);

create index if not exists idx_course_materials_verification_id
  on public.course_materials(verification_id);

create index if not exists idx_course_materials_course_code
  on public.course_materials(course_code);

create index if not exists idx_course_materials_locked
  on public.course_materials(is_locked);

create index if not exists idx_material_upload_attempts_verification
  on public.material_upload_attempts(verification_id, course_code);

create index if not exists idx_material_upload_attempts_created
  on public.material_upload_attempts(created_at desc);

alter table public.course_materials enable row level security;
alter table public.material_upload_attempts enable row level security;

drop policy if exists "Users can read own course materials" on public.course_materials;
create policy "Users can read own course materials"
  on public.course_materials for select
  using (auth.uid() = user_id);

drop policy if exists "No direct client writes to course materials" on public.course_materials;
create policy "No direct client writes to course materials"
  on public.course_materials for all
  using (false);

drop policy if exists "Staff can read all course materials" on public.course_materials;
create policy "Staff can read all course materials"
  on public.course_materials for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('admin', 'support', 'assistant')
    )
  );

drop policy if exists "Users can read own material upload attempts" on public.material_upload_attempts;
create policy "Users can read own material upload attempts"
  on public.material_upload_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "No direct client writes to material upload attempts" on public.material_upload_attempts;
create policy "No direct client writes to material upload attempts"
  on public.material_upload_attempts for all
  using (false);

grant select, insert, update, delete
  on table public.course_materials
  to service_role;

grant select, insert, update, delete
  on table public.material_upload_attempts
  to service_role;

comment on table public.course_materials is 'Stores uploaded course materials (ZIP files) with grade-based tiering';
comment on table public.material_upload_attempts is 'Tracks all upload attempts for time-based locking';
