-- Add deterministic verification outputs for transcript pipeline.
alter table public.grade_verifications
  add column if not exists parsed_transcript jsonb,
  add column if not exists parser_source text,
  add column if not exists extraction_confidence numeric(5,4),
  add column if not exists extraction_quality text,
  add column if not exists pdf_metadata jsonb,
  add column if not exists risk_score integer not null default 0,
  add column if not exists risk_level text,
  add column if not exists risk_reasons jsonb,
  add column if not exists verification_decision text;

alter table public.grade_verifications
  drop constraint if exists grade_verifications_risk_level_check;

alter table public.grade_verifications
  add constraint grade_verifications_risk_level_check
  check (risk_level is null or risk_level in ('low', 'medium', 'high'));

alter table public.grade_verifications
  drop constraint if exists grade_verifications_verification_decision_check;

alter table public.grade_verifications
  add constraint grade_verifications_verification_decision_check
  check (verification_decision is null or verification_decision in ('auto_verify', 'manual_review', 'reject'));

create index if not exists idx_grade_verifications_risk_level
  on public.grade_verifications(risk_level);

create index if not exists idx_grade_verifications_verification_decision
  on public.grade_verifications(verification_decision);
