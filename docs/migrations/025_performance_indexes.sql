-- Performance indexes for marketplace and course lookups

CREATE INDEX IF NOT EXISTS idx_note_listings_published_created
  ON public.note_listings (created_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_note_listings_course_published
  ON public.note_listings (course_code, created_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_verified_courses_course_code
  ON public.verified_courses (course_code);
