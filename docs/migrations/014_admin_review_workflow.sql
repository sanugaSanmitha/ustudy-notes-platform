-- Production admin review workflow: reviewer lock + timestamps.
alter table public.admin_review_requests
  add column if not exists review_started_at timestamptz,
  add column if not exists reviewed_by uuid references public.users(id) on delete set null;

create index if not exists idx_admin_review_requests_reviewed_by
  on public.admin_review_requests(reviewed_by);

create index if not exists idx_admin_review_requests_status_review_started
  on public.admin_review_requests(status, review_started_at desc);
