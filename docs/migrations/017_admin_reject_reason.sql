-- Structured reject reasons for admin transcript reviews.
alter table public.admin_review_requests
  add column if not exists reject_reason text check (
    reject_reason is null or reject_reason in (
      'illegible_document',
      'missing_pages',
      'mismatched_student_info',
      'suspected_fraud',
      'incomplete_extraction',
      'other'
    )
  ),
  add column if not exists reject_comment text;
