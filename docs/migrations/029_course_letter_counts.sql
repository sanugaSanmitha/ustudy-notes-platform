-- Aggregate catalog letter counts so /courses does not page through every course row.

CREATE OR REPLACE FUNCTION public.get_course_letter_counts(p_level text DEFAULT 'all')
RETURNS TABLE (
  letter text,
  count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    upper(left(c.course_code, 1)) AS letter,
    COUNT(*)::bigint AS count
  FROM public.courses c
  WHERE (p_level IS NULL OR p_level = 'all' OR c.level = p_level)
    AND left(c.course_code, 1) ~ '^[A-Za-z]$'
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE INDEX IF NOT EXISTS idx_courses_letter_level
  ON public.courses (upper(left(course_code, 1)), level);

GRANT EXECUTE ON FUNCTION public.get_course_letter_counts(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_course_letter_counts(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_letter_counts(text) TO anon;
