import { adminClient } from '@/lib/supabase/admin';
import { enrichCourseRow } from '@/lib/courses/catalog';
import { normalizeCourseCode, normalizeCourseName, normalizeGrade } from '@/lib/grades/review-model';

type CourseRow = {
  courseCode?: string;
  courseName?: string;
  grade?: string;
  semester?: string | null;
  academicYear?: string | null;
};

function parseSemesterTerm(term: string | null | undefined) {
  const raw = String(term || '').trim();
  if (!raw) {
    return { academicYear: null as string | null, semester: null as string | null };
  }

  const seasonMatch = raw.match(/\b(Fall|Winter|Spring|Summer)\b/i);
  const yearMatch = raw.match(/\b(20\d{2})(?:\s*[-/]\s*(20\d{2}))?\b/);
  const semester = seasonMatch ? seasonMatch[1][0].toUpperCase() + seasonMatch[1].slice(1).toLowerCase() : raw;
  const academicYear = yearMatch
    ? yearMatch[2]
      ? `${yearMatch[1]}-${yearMatch[2]}`
      : yearMatch[1]
    : null;

  return { academicYear, semester };
}

function extractCoursesFromVerification(record: {
  review_rows?: unknown;
  manual_courses?: unknown;
  parsed_courses?: unknown;
  parsed_transcript?: unknown;
}): CourseRow[] {
  const reviewRows = Array.isArray(record.review_rows) ? record.review_rows : [];
  if (reviewRows.length > 0) {
    return reviewRows.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        courseCode: String(item.courseCode || ''),
        courseName: String(item.courseName || ''),
        grade: String(item.grade || ''),
      };
    });
  }

  const manualCourses = Array.isArray(record.manual_courses) ? record.manual_courses : [];
  if (manualCourses.length > 0) {
    return manualCourses.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        courseCode: String(item.courseCode || ''),
        courseName: String(item.courseName || ''),
        grade: String(item.grade || ''),
      };
    });
  }

  const parsedCourses = Array.isArray(record.parsed_courses) ? record.parsed_courses : [];
  const semesterByCode = new Map<string, { academicYear: string | null; semester: string | null }>();
  const transcript = (record.parsed_transcript || {}) as Record<string, unknown>;
  const semesters = Array.isArray(transcript.semesters) ? transcript.semesters : [];

  for (const semester of semesters) {
    const term = String((semester as Record<string, unknown>).term || '');
    const parsedTerm = parseSemesterTerm(term);
    const courses = Array.isArray((semester as Record<string, unknown>).courses)
      ? ((semester as Record<string, unknown>).courses as Array<Record<string, unknown>>)
      : [];
    for (const course of courses) {
      const code = normalizeCourseCode(String(course.courseCode || ''));
      if (code) {
        semesterByCode.set(code, parsedTerm);
      }
    }
  }

  return parsedCourses.map((row) => {
    const item = row as Record<string, unknown>;
    const courseCode = String(item.courseCode || '');
    const termMeta = semesterByCode.get(normalizeCourseCode(courseCode));
    return {
      courseCode,
      courseName: String(item.courseName || ''),
      grade: String(item.grade || ''),
      academicYear: termMeta?.academicYear || null,
      semester: termMeta?.semester || null,
    };
  });
}

export async function fetchVerifiedCourseCodeSet(userId: string) {
  const { data, error } = await adminClient.from('verified_courses').select('course_code').eq('user_id', userId);

  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => normalizeCourseCode(String(row.course_code || ''))).filter(Boolean));
}

export function filterCoursesNotAlreadyVerified<T extends { courseCode?: string }>(
  courses: T[],
  existingCodes: Set<string>
) {
  return courses.filter((course) => {
    const code = normalizeCourseCode(String(course.courseCode || ''));
    return Boolean(code) && !existingCodes.has(code);
  });
}

export async function syncVerifiedCoursesForApproval(verificationId: string, userId: string) {
  const { data: verification, error } = await adminClient
    .from('grade_verifications')
    .select('id, user_id, status, review_rows, manual_courses, parsed_courses, parsed_transcript, reviewed_at')
    .eq('id', verificationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!verification || verification.user_id !== userId || verification.status !== 'approved') {
    return { synced: 0, skipped: 0 };
  }

  const existingCodes = await fetchVerifiedCourseCodeSet(userId);
  let skippedDuringSync = 0;
  const courses = [];
  for (const course of extractCoursesFromVerification(verification)) {
    const normalized = {
      courseCode: normalizeCourseCode(course.courseCode || ''),
      courseName: normalizeCourseName(course.courseName),
      grade: normalizeGrade(course.grade || ''),
      academicYear: course.academicYear || null,
      semester: course.semester || null,
    };
    if (!normalized.courseCode || !normalized.grade) continue;
    if (existingCodes.has(normalized.courseCode)) {
      skippedDuringSync += 1;
      continue;
    }
    const enriched = await enrichCourseRow(normalized);
    courses.push(enriched);
    existingCodes.add(normalized.courseCode);
  }

  const uniqueCourses = new Map<string, (typeof courses)[number]>();
  for (const course of courses) {
    uniqueCourses.set(course.courseCode, course);
  }

  const verifiedAt = verification.reviewed_at || new Date().toISOString();
  const now = new Date().toISOString();

  const rows = Array.from(uniqueCourses.values()).map((course) => ({
    user_id: userId,
    verification_id: verificationId,
    course_code: course.courseCode,
    course_name: course.courseName || null,
    grade: course.grade,
    academic_year: course.academicYear,
    semester: course.semester,
    verified_at: verifiedAt,
    updated_at: now,
  }));

  if (rows.length === 0) {
    return { synced: 0, skipped: skippedDuringSync };
  }

  const { error: insertError } = await adminClient.from('verified_courses').insert(rows);
  if (insertError) {
    throw insertError;
  }

  return { synced: rows.length, skipped: skippedDuringSync };
}
