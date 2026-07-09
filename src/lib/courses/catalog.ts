import { unstable_cache } from 'next/cache';
import { adminClient } from '@/lib/supabase/admin';
import { normalizeCourseCode } from '@/lib/grades/review-model';

export type CatalogCourse = {
  courseCode: string;
  courseTitle: string;
  level: 'UG' | 'PG';
};

export type CourseSearchParams = {
  q?: string;
  level?: 'UG' | 'PG' | 'all';
  dept?: string;
  limit?: number;
  offset?: number;
};

type CourseRow = {
  course_code: string;
  course_title: string;
  level: 'UG' | 'PG';
};

function mapCourse(row: CourseRow): CatalogCourse {
  return {
    courseCode: row.course_code,
    courseTitle: row.course_title,
    level: row.level,
  };
}

function pickPrimaryCourse(rows: CourseRow[]): CatalogCourse | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.course_title.length - a.course_title.length);
  return mapCourse(sorted[0]);
}

export async function searchCourses(params: CourseSearchParams = {}) {
  const q = (params.q || '').trim();
  const level = params.level || 'all';
  const dept = (params.dept || '').trim().toUpperCase();
  const limit = Math.min(50, Math.max(1, params.limit || 20));
  const offset = Math.max(0, params.offset || 0);

  return unstable_cache(
    () => searchCoursesUncached({ q, level, dept, limit, offset }),
    ['course-search', q, level, dept, String(limit), String(offset)],
    { revalidate: 3600, tags: ['course-catalog'] }
  )();
}

async function searchCoursesUncached(params: Required<Pick<CourseSearchParams, 'q' | 'level' | 'dept' | 'limit' | 'offset'>>) {
  const { q, level, dept, limit, offset } = params;

  let query = adminClient
    .from('courses')
    .select('course_code, course_title, level', { count: 'exact' })
    .order('course_code', { ascending: true })
    .range(offset, offset + limit - 1);

  if (level === 'UG' || level === 'PG') {
    query = query.eq('level', level);
  }

  if (dept) {
    query = query.ilike('course_code', `${dept}%`);
  }

  if (q) {
    const normalized = q.toUpperCase().replace(/\s+/g, '');
    if (/^[A-Z]{2,5}\d{0,4}[A-Z]?$/.test(normalized)) {
      query = query.ilike('course_code', `${normalized}%`);
    } else {
      query = query.or(`course_code.ilike.%${normalized}%,course_title.ilike.%${q}%`);
    }
  }

  const { data, error, count } = await query;

  if (error) {
    if (error.message.includes('relation "public.courses" does not exist')) {
      return { ok: false as const, error: 'CATALOG_NOT_READY', courses: [], total: 0 };
    }
    throw error;
  }

  return {
    ok: true as const,
    courses: (data || []).map(mapCourse),
    total: count || 0,
  };
}

export async function getCoursesByCode(courseCode: string) {
  const code = normalizeCourseCode(courseCode);
  if (!code) {
    return { ok: true as const, courses: [] as CatalogCourse[], primary: null as CatalogCourse | null };
  }

  const { data, error } = await adminClient
    .from('courses')
    .select('course_code, course_title, level')
    .eq('course_code', code)
    .order('course_title', { ascending: true });

  if (error) {
    if (error.message.includes('relation "public.courses" does not exist')) {
      return { ok: false as const, error: 'CATALOG_NOT_READY', courses: [], primary: null };
    }
    throw error;
  }

  const rows = data || [];
  return {
    ok: true as const,
    courses: rows.map(mapCourse),
    primary: pickPrimaryCourse(rows),
  };
}

export async function getCourseTitlesByCode(courseCodes: string[]) {
  const codes = Array.from(
    new Set(courseCodes.map((code) => normalizeCourseCode(code)).filter(Boolean))
  ) as string[];

  const titleByCode = new Map<string, string>();
  if (codes.length === 0) {
    return titleByCode;
  }

  const { data, error } = await adminClient
    .from('courses')
    .select('course_code, course_title')
    .in('course_code', codes);

  if (error) {
    if (error.message.includes('relation "public.courses" does not exist')) {
      return titleByCode;
    }
    throw error;
  }

  for (const code of codes) {
    const rows = (data || []).filter((row) => normalizeCourseCode(row.course_code) === code) as CourseRow[];
    const primary = pickPrimaryCourse(rows);
    if (primary) {
      titleByCode.set(code, primary.courseTitle);
    }
  }

  return titleByCode;
}

export async function isKnownCourseCode(courseCode: string) {
  const code = normalizeCourseCode(courseCode);
  if (!code) return false;

  const { count, error } = await adminClient
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', code);

  if (error) {
    if (error.message.includes('relation "public.courses" does not exist')) {
      return false;
    }
    throw error;
  }

  return (count || 0) > 0;
}

export async function enrichCourseRow<T extends { courseCode: string; courseName?: string }>(row: T): Promise<T> {
  const code = normalizeCourseCode(row.courseCode);
  if (!code) return row;

  const { primary } = await getCoursesByCode(code);
  if (!primary) return row;

  const existingName = (row.courseName || '').trim();
  if (!existingName || existingName.toLowerCase() === 'exclusion(s)') {
    return { ...row, courseCode: code, courseName: primary.courseTitle };
  }

  return { ...row, courseCode: code };
}

export async function enrichCourseRows<T extends { courseCode: string; courseName?: string }>(rows: T[]) {
  if (rows.length === 0) {
    return rows;
  }

  const titleByCode = await getCourseTitlesByCode(rows.map((row) => row.courseCode));

  return rows.map((row) => {
    const code = normalizeCourseCode(row.courseCode);
    if (!code) {
      return row;
    }

    const title = titleByCode.get(code);
    if (!title) {
      return { ...row, courseCode: code };
    }

    const existingName = (row.courseName || '').trim();
    if (!existingName || existingName.toLowerCase() === 'exclusion(s)') {
      return { ...row, courseCode: code, courseName: title };
    }

    return { ...row, courseCode: code };
  });
}

export async function findUnknownCourseCodes(courseCodes: string[]) {
  const normalizedCodes = Array.from(
    new Set(
      courseCodes
        .map((raw) => normalizeCourseCode(raw))
        .filter(Boolean)
    )
  ) as string[];

  if (normalizedCodes.length === 0) {
    return [];
  }

  const { data, error } = await adminClient
    .from('courses')
    .select('course_code')
    .in('course_code', normalizedCodes);

  if (error) {
    if (error.message.includes('relation "public.courses" does not exist')) {
      return normalizedCodes;
    }
    throw error;
  }

  const knownCodes = new Set(
    (data || []).map((row) => normalizeCourseCode(row.course_code)).filter(Boolean)
  );

  return normalizedCodes.filter((code) => !knownCodes.has(code));
}

export { getPublishedListingsForCourse } from '@/lib/notes/marketplace';

export async function countPublishedNotes() {
  const { count, error } = await adminClient
    .from('note_listings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  if (error) {
    return 0;
  }

  return count || 0;
}
