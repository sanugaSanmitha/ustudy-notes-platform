-- Add user-confirmation, review-row tracking, and rejection retention fields.
alter table public.grade_verifications
  add column if not exists confirmation_required boolean not null default false,
  add column if not exists auto_approval_eligible boolean not null default false,
  add column if not exists confirmation_completed_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_retention_until timestamptz,
  add column if not exists review_rows jsonb,
  add column if not exists parse_attempts integer not null default 1,
  add column if not exists failed_parse_attempts integer not null default 0;

alter table public.grade_verifications
  drop constraint if exists grade_verifications_parse_attempts_check;

alter table public.grade_verifications
  add constraint grade_verifications_parse_attempts_check
  check (parse_attempts >= 1);

alter table public.grade_verifications
  drop constraint if exists grade_verifications_failed_parse_attempts_check;

alter table public.grade_verifications
  add constraint grade_verifications_failed_parse_attempts_check
  check (failed_parse_attempts >= 0);

create index if not exists idx_grade_verifications_confirmation_required
  on public.grade_verifications(confirmation_required, created_at desc);

create index if not exists idx_grade_verifications_rejected_retention_until
  on public.grade_verifications(rejected_retention_until);
