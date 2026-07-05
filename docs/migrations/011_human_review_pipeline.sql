-- Human-in-the-loop transcript verification pipeline foundation.

create table if not exists public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('user', 'support', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index if not exists idx_user_roles_role
  on public.user_roles(role);

alter table public.user_roles enable row level security;

drop policy if exists "Users can read own roles" on public.user_roles;
create policy "Users can read own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

drop policy if exists "No direct client writes to user roles" on public.user_roles;
create policy "No direct client writes to user roles"
  on public.user_roles for all
  using (false);

grant select, insert, update, delete
  on table public.user_roles
  to service_role;

create table if not exists public.grade_parse_queue (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null unique references public.grade_verifications(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (
    status in (
      'pending',
      'queued_support_fast',
      'queued_support_normal',
      'queued_manual_fallback',
      'under_review',
      'approved',
      'rejected',
      'reupload_required',
      'auto_approved'
    )
  ),
  queue_tier text not null default 'normal' check (
    queue_tier in ('fast', 'normal', 'manual_fallback')
  ),
  confidence_score integer check (confidence_score >= 0 and confidence_score <= 100),
  ai_result_json jsonb,
  parser_source text,
  failure_reason text,
  assigned_to uuid references public.users(id) on delete set null,
  assigned_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_grade_parse_queue_status_created
  on public.grade_parse_queue(status, created_at);

create index if not exists idx_grade_parse_queue_tier_status
  on public.grade_parse_queue(queue_tier, status, created_at);

create index if not exists idx_grade_parse_queue_assigned
  on public.grade_parse_queue(assigned_to, status);

alter table public.grade_parse_queue enable row level security;

drop policy if exists "Users can read own parse queue rows" on public.grade_parse_queue;
create policy "Users can read own parse queue rows"
  on public.grade_parse_queue for select
  using (auth.uid() = user_id);

drop policy if exists "Support and admin can read parse queue rows" on public.grade_parse_queue;
create policy "Support and admin can read parse queue rows"
  on public.grade_parse_queue for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('support', 'admin')
    )
  );

drop policy if exists "Support and admin can update parse queue rows" on public.grade_parse_queue;
create policy "Support and admin can update parse queue rows"
  on public.grade_parse_queue for update
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('support', 'admin')
    )
  );

drop policy if exists "No direct client inserts to parse queue" on public.grade_parse_queue;
create policy "No direct client inserts to parse queue"
  on public.grade_parse_queue for insert
  with check (false);

drop policy if exists "No direct client deletes from parse queue" on public.grade_parse_queue;
create policy "No direct client deletes from parse queue"
  on public.grade_parse_queue for delete
  using (false);

grant select, insert, update, delete
  on table public.grade_parse_queue
  to service_role;

create table if not exists public.review_actions (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.grade_parse_queue(id) on delete set null,
  verification_id uuid references public.grade_verifications(id) on delete set null,
  review_request_id uuid references public.admin_review_requests(id) on delete set null,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_role text not null check (actor_role in ('support', 'admin', 'system')),
  action_type text not null,
  from_status text,
  to_status text,
  notes text,
  before_payload jsonb,
  after_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_review_actions_queue_created
  on public.review_actions(queue_id, created_at desc);

create index if not exists idx_review_actions_verification_created
  on public.review_actions(verification_id, created_at desc);

create index if not exists idx_review_actions_actor_created
  on public.review_actions(actor_user_id, created_at desc);

alter table public.review_actions enable row level security;

drop policy if exists "Users can read own review actions" on public.review_actions;
create policy "Users can read own review actions"
  on public.review_actions for select
  using (
    exists (
      select 1
      from public.grade_parse_queue gpq
      where gpq.id = review_actions.queue_id
        and gpq.user_id = auth.uid()
    )
  );

drop policy if exists "Support and admin can read review actions" on public.review_actions;
create policy "Support and admin can read review actions"
  on public.review_actions for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('support', 'admin')
    )
  );

drop policy if exists "No direct client writes to review actions" on public.review_actions;
create policy "No direct client writes to review actions"
  on public.review_actions for all
  using (false);

grant select, insert, update, delete
  on table public.review_actions
  to service_role;
