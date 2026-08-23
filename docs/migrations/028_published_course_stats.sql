-- Aggregate published listings by course so marketplace pages do not scan every row.

CREATE OR REPLACE FUNCTION public.get_published_course_listing_stats()
RETURNS TABLE (
  course_code text,
  listing_count bigint,
  seller_count bigint,
  latest_listing_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    nl.course_code,
    COUNT(*)::bigint AS listing_count,
    COUNT(DISTINCT nl.user_id)::bigint AS seller_count,
    MAX(nl.created_at) AS latest_listing_at
  FROM public.note_listings nl
  WHERE nl.status = 'published'
  GROUP BY nl.course_code
  ORDER BY latest_listing_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_course_listing_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_published_course_listing_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_published_course_listing_stats() TO anon;
