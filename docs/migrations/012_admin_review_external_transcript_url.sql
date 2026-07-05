-- Optional external transcript URL (Google Drive / OneDrive) for manual review fallback.
alter table public.admin_review_requests
  add column if not exists external_transcript_url text;

alter table public.admin_review_requests
  drop constraint if exists admin_review_requests_external_transcript_url_check;

alter table public.admin_review_requests
  add constraint admin_review_requests_external_transcript_url_check
  check (
    external_transcript_url is null
    or external_transcript_url ~* '^https?://'
  );
