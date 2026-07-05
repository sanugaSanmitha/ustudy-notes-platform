-- Manual admin review requests for failed or difficult transcript cases.
create table if not exists public.admin_review_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  upload_id uuid not null references public.grade_verifications(id) on delete cascade,
  issue_type text not null check (
    issue_type in (
      'incorrect_grades',
      'missing_courses',
      'wrong_student_info',
      'format_not_supported',
      'other'
    )
  ),
  message text check (char_length(message) <= 500),
  status text not null default 'pending' check (
    status in ('pending', 'reviewing', 'approved', 'rejected')
  ),
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_review_requests_user_id
  on public.admin_review_requests(user_id);

create index if not exists idx_admin_review_requests_upload_id
  on public.admin_review_requests(upload_id);

create index if not exists idx_admin_review_requests_status_created
  on public.admin_review_requests(status, created_at desc);

alter table public.admin_review_requests enable row level security;

drop policy if exists "Users can read own admin review requests" on public.admin_review_requests;
create policy "Users can read own admin review requests"
  on public.admin_review_requests for select
  using (auth.uid() = user_id);

drop policy if exists "No direct client writes to admin review requests" on public.admin_review_requests;
create policy "No direct client writes to admin review requests"
  on public.admin_review_requests for all
  using (false);

grant select, insert, update, delete
  on table public.admin_review_requests
  to service_role;
