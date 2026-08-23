import { unstable_cache } from 'next/cache';
import { adminClient } from '@/lib/supabase/admin';
import { normalizeCourseCode } from '@/lib/grades/review-model';
import { getPublishedListingCountsByCourse } from '@/lib/notes/marketplace';

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

async function getCoursesByCodeUncached(code: string) {
  const { data, error } = await adminClient
    .from('courses')
    .select('course_code, course_title, level')
    .eq('course_code', code)
    .order('course_title', { ascending: true });

  if (error) {
    if (error.message.includes('relation "public.courses" does not exist')) {
      return { ok: false as const, error: 'CATALOG_NOT_READY' as const, courses: [] as CatalogCourse[], primary: null as CatalogCourse | null };
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

export async function getCoursesByCode(courseCode: string) {
  const code = normalizeCourseCode(courseCode);
  if (!code) {
    return { ok: true as const, courses: [] as CatalogCourse[], primary: null as CatalogCourse | null };
  }

  return unstable_cache(
    () => getCoursesByCodeUncached(code),
    ['course-by-code', code],
    { revalidate: 3600, tags: ['course-catalog'] }
  )();
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

  const rowsByCode = new Map<string, CourseRow[]>();
  for (const row of (data || []) as CourseRow[]) {
    const code = normalizeCourseCode(row.course_code);
    if (!code) continue;
    const list = rowsByCode.get(code) || [];
    list.push(row);
    rowsByCode.set(code, list);
  }

  for (const code of codes) {
    const primary = pickPrimaryCourse(rowsByCode.get(code) || []);
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

export type BrowseCoursePill = {
  courseCode: string;
  listingCount: number;
};

export type CourseLetterCount = {
  letter: string;
  count: number;
};

export async function getCourseLetterCounts(level: 'UG' | 'PG' | 'all' = 'all'): Promise<CourseLetterCount[]> {
  return unstable_cache(
    () => getCourseLetterCountsUncached(level),
    ['course-letter-counts-v2', level],
    { revalidate: 3600, tags: ['course-catalog'] }
  )();
}

async function getCourseLetterCountsUncached(level: 'UG' | 'PG' | 'all'): Promise<CourseLetterCount[]> {
  const { data, error } = await adminClient.rpc('get_course_letter_counts', { p_level: level });

  if (!error && Array.isArray(data)) {
    return (data as Array<{ letter: string; count: number | string }>)
      .map((row) => ({
        letter: String(row.letter || '').toUpperCase(),
        count: Number(row.count) || 0,
      }))
      .filter((row) => /^[A-Z]$/.test(row.letter) && row.count > 0)
      .sort((a, b) => a.letter.localeCompare(b.letter));
  }

  const counts = new Map<string, number>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    let query = adminClient.from('courses').select('course_code');
    if (level === 'UG' || level === 'PG') {
      query = query.eq('level', level);
    }

    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) {
      if (error.message.includes('relation "public.courses" does not exist')) {
        return [];
      }
      throw error;
    }

    const rows = data || [];
    for (const row of rows) {
      const letter = (row.course_code || '').charAt(0).toUpperCase();
      if (letter >= 'A' && letter <= 'Z') {
        counts.set(letter, (counts.get(letter) || 0) + 1);
      }
    }

    if (rows.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return Array.from({ length: 26 }, (_, index) => {
    const letter = String.fromCharCode(65 + index);
    return { letter, count: counts.get(letter) || 0 };
  }).filter((item) => item.count > 0);
}

export async function getBrowseCoursePills(): Promise<BrowseCoursePill[]> {
  const counts = await getPublishedListingCountsByCourse();
  return counts.map(({ courseCode, listingCount }) => ({ courseCode, listingCount }));
}

export { getPublishedListingsForCourse } from '@/lib/notes/marketplace';
