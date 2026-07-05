-- Grade verification submissions for seller onboarding.
create table if not exists public.grade_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending_review' check (
    status in ('manual_required', 'pending_review', 'approved', 'rejected')
  ),
  submission_type text not null default 'pdf_auto' check (
    submission_type in ('pdf_auto', 'pdf_manual', 'manual')
  ),
  transcript_filename text,
  transcript_content_type text,
  transcript_size_bytes integer,
  parsed_courses jsonb,
  manual_courses jsonb,
  screenshot_url text,
  reviewer_note text,
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_grade_verifications_user_id
  on public.grade_verifications(user_id);

create index if not exists idx_grade_verifications_user_created
  on public.grade_verifications(user_id, created_at desc);

create index if not exists idx_grade_verifications_status
  on public.grade_verifications(status);

alter table public.grade_verifications enable row level security;

drop policy if exists "Users can read own grade verifications" on public.grade_verifications;
create policy "Users can read own grade verifications"
  on public.grade_verifications for select
  using (auth.uid() = user_id);

drop policy if exists "No direct client writes to grade verifications" on public.grade_verifications;
create policy "No direct client writes to grade verifications"
  on public.grade_verifications for all
  using (false);

grant select, insert, update, delete
  on table public.grade_verifications
  to service_role;
