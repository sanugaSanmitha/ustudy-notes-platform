-- Manual verification workflow: extended statuses, priority, assignment metadata, reassignment.

alter table public.admin_review_requests
  drop constraint if exists admin_review_requests_status_check;

alter table public.admin_review_requests
  add constraint admin_review_requests_status_check
  check (
    status in (
      'pending',
      'reviewing',
      'waiting_student',
      'pending_reassignment',
      'escalated',
      'approved',
      'rejected'
    )
  );

alter table public.admin_review_requests
  add column if not exists priority text not null default 'normal'
    check (priority in ('urgent', 'high', 'normal', 'low')),
  add column if not exists queue text not null default 'team'
    check (queue in ('team')),
  add column if not exists assigned_by text
    check (assigned_by is null or assigned_by in ('self_claim', 'admin')),
  add column if not exists assigned_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists internal_notes text,
  add column if not exists reassignment_requested_by uuid references public.users(id) on delete set null,
  add column if not exists reassignment_reason text,
  add column if not exists reassignment_requested_at timestamptz,
  add column if not exists escalated_at timestamptz,
  add column if not exists student_info_request text;

create index if not exists idx_admin_review_requests_priority_created
  on public.admin_review_requests(priority, created_at desc);

create index if not exists idx_admin_review_requests_status_priority
  on public.admin_review_requests(status, priority, created_at desc);

alter table public.review_actions
  drop constraint if exists review_actions_actor_role_check;

alter table public.review_actions
  add constraint review_actions_actor_role_check
  check (actor_role in ('support', 'admin', 'assistant', 'system'));
