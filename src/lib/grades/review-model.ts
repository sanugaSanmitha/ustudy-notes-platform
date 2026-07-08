import { randomUUID } from 'crypto';

export type CourseReviewSource = 'ai' | 'user_added';
export type CourseReviewState = 'green' | 'purple' | 'orange';

export type CourseReviewRow = {
  id: string;
  source: CourseReviewSource;
  rowState: CourseReviewState;
  edited: boolean;
  confidence: number | null;
  courseCode: string;
  courseName: string;
  grade: string;
};

type BasicCourse = {
  courseCode: string;
  courseName?: string;
  grade: string;
};

export function normalizeCourseCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeCourseName(value: string | undefined) {
  return String(value || '').trim();
}

export function normalizeGrade(value: string) {
  return value.trim().toUpperCase();
}

export function buildManualReviewRows(courses: BasicCourse[]): CourseReviewRow[] {
  return courses.map((course) => ({
    id: randomUUID(),
    source: 'user_added' as const,
    rowState: 'orange' as const,
    edited: true,
    confidence: null,
    courseCode: normalizeCourseCode(course.courseCode),
    courseName: normalizeCourseName(course.courseName),
    grade: normalizeGrade(course.grade),
  }));
}

export function resolveVerificationReviewRows(verification: {
  review_rows?: CourseReviewRow[] | null;
  manual_courses?: BasicCourse[] | null;
  parsed_courses?: BasicCourse[] | null;
}): CourseReviewRow[] {
  const reviewRows = verification.review_rows;
  if (Array.isArray(reviewRows) && reviewRows.length > 0) {
    return sanitizeCourseReviewRows(reviewRows as CourseReviewRow[]);
  }

  const manualCourses = verification.manual_courses;
  if (Array.isArray(manualCourses) && manualCourses.length > 0) {
    return buildManualReviewRows(manualCourses);
  }

  const parsedCourses = verification.parsed_courses;
  if (Array.isArray(parsedCourses) && parsedCourses.length > 0) {
    return buildInitialReviewRows(parsedCourses, 0);
  }

  return [];
}

export function buildInitialReviewRows(courses: BasicCourse[], extractionConfidence: number): CourseReviewRow[] {
  return courses.map((course) => ({
    id: randomUUID(),
    source: 'ai',
    rowState: 'green',
    edited: false,
    confidence: Number.isFinite(extractionConfidence) ? extractionConfidence : null,
    courseCode: normalizeCourseCode(course.courseCode),
    courseName: normalizeCourseName(course.courseName),
    grade: normalizeGrade(course.grade),
  }));
}

export function sanitizeCourseReviewRows(rows: CourseReviewRow[]): CourseReviewRow[] {
  return rows.map((row) => {
    const source: CourseReviewSource = row.source === 'user_added' ? 'user_added' : 'ai';
    const edited = Boolean(row.edited);
    const rowState: CourseReviewState =
      source === 'user_added' ? 'orange' : edited ? 'purple' : 'green';
    return {
      id: row.id || randomUUID(),
      source,
      rowState,
      edited,
      confidence: typeof row.confidence === 'number' && Number.isFinite(row.confidence) ? row.confidence : null,
      courseCode: normalizeCourseCode(row.courseCode),
      courseName: normalizeCourseName(row.courseName),
      grade: normalizeGrade(row.grade),
    };
  });
}

export function summarizeReviewRows(rows: CourseReviewRow[]) {
  let green = 0;
  let purple = 0;
  let orange = 0;

  for (const row of rows) {
    if (row.rowState === 'purple') {
      purple += 1;
    } else if (row.rowState === 'orange') {
      orange += 1;
    } else {
      green += 1;
    }
  }

  return {
    green,
    purple,
    orange,
    hasOnlyGreen: purple === 0 && orange === 0,
    hasNeedsReview: purple > 0 || orange > 0,
  };
}

export function toNormalizedCourses(rows: CourseReviewRow[]) {
  return rows.map((row) => ({
    courseCode: normalizeCourseCode(row.courseCode),
    courseName: normalizeCourseName(row.courseName),
    grade: normalizeGrade(row.grade),
  }));
}
