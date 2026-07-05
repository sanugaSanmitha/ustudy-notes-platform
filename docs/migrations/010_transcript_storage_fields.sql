-- Persist uploaded transcript file references for admin review workflow.
alter table public.grade_verifications
  add column if not exists transcript_storage_bucket text,
  add column if not exists transcript_storage_path text,
  add column if not exists transcript_storage_uploaded_at timestamptz;

create index if not exists idx_grade_verifications_storage_path
  on public.grade_verifications(transcript_storage_path);
