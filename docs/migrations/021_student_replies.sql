-- Student replies to reviewer information requests on admin review requests.

create table if not exists public.admin_review_student_replies (
  id uuid primary key default gen_random_uuid(),
  review_request_id uuid not null references public.admin_review_requests(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null check (char_length(trim(message)) >= 1),
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_review_student_replies_request_id
  on public.admin_review_student_replies(review_request_id, created_at desc);

create index if not exists idx_admin_review_student_replies_user_id
  on public.admin_review_student_replies(user_id);

alter table public.admin_review_student_replies enable row level security;

drop policy if exists "Users can read own admin review student replies" on public.admin_review_student_replies;
create policy "Users can read own admin review student replies"
  on public.admin_review_student_replies for select
  using (auth.uid() = user_id);

drop policy if exists "No direct client writes to admin review student replies" on public.admin_review_student_replies;
create policy "No direct client writes to admin review student replies"
  on public.admin_review_student_replies for all
  using (false);

grant select, insert, update, delete
  on table public.admin_review_student_replies
  to service_role;
