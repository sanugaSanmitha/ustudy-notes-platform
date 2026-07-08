-- Assistant reviewer role + pre-review assignment on admin review requests.

alter table public.user_roles
  drop constraint if exists user_roles_role_check;

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('user', 'support', 'admin', 'assistant'));

alter table public.admin_review_requests
  add column if not exists assigned_to uuid references public.users(id) on delete set null,
  add column if not exists assigned_at timestamptz;

create index if not exists idx_admin_review_requests_assigned_to
  on public.admin_review_requests(assigned_to);
