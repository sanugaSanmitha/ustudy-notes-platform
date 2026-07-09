-- Admin review metadata for note listing moderation.
alter table public.note_listings
  add column if not exists reviewed_by uuid references public.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists admin_notes text,
  add column if not exists reject_reason text check (
    reject_reason is null or reject_reason in (
      'inappropriate_content',
      'copyright_concern',
      'insufficient_quality',
      'wrong_course_or_metadata',
      'duplicate_listing',
      'other'
    )
  ),
  add column if not exists reject_comment text;

create index if not exists idx_note_listings_reviewed_by on public.note_listings(reviewed_by);
create index if not exists idx_note_listings_published_at on public.note_listings(published_at desc nulls last);
