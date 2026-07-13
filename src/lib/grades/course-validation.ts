import type { CourseReviewRow } from '@/lib/grades/review-model';
import { findUnknownCourseCodes } from '@/lib/courses/catalog';

/** Grades allowed when a student submits courses manually after a failed parse. */
export const MANUAL_SUBMISSION_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-'] as const;

const MANUAL_SUBMISSION_GRADE_SET = new Set<string>(MANUAL_SUBMISSION_GRADES);

export function isValidManualSubmissionGrade(grade: string) {
  return MANUAL_SUBMISSION_GRADE_SET.has(grade.trim().toUpperCase());
}

/** University-style letter grades commonly seen on transcripts. */
const ST_GRADES = new Set([
  'A+', 'A', 'A-',
  'B+', 'B', 'B-',
  'C+', 'C', 'C-',
  'D+', 'D', 'D-',
  'F', 'P', 'PP', 'AU', 'W', 'T', 'I', 'S', 'U',
]);

export type CourseValidationIssue = {
  rowId: string;
  field: string;
  message: string;
};

export function isValidGrade(grade: string) {
  const normalized = grade.trim().toUpperCase();
  return ST_GRADES.has(normalized);
}

export function validateCourseRows(rows: CourseReviewRow[]): CourseValidationIssue[] {
  const issues: CourseValidationIssue[] = [];
  const seen = new Map<string, string[]>();

  for (const row of rows) {
    if (!row.courseCode.trim()) {
      issues.push({ rowId: row.id, field: 'courseCode', message: 'Course code is required.' });
    } else if (row.courseCode.length > 20) {
      issues.push({ rowId: row.id, field: 'courseCode', message: 'Course code is too long.' });
    }

    if (!row.courseName.trim()) {
      issues.push({ rowId: row.id, field: 'courseName', message: 'Course name is required.' });
    } else if (row.courseName.length > 200) {
      issues.push({ rowId: row.id, field: 'courseName', message: 'Course name is too long.' });
    }

    if (!row.grade.trim()) {
      issues.push({ rowId: row.id, field: 'grade', message: 'Grade is required.' });
    } else if (!isValidGrade(row.grade)) {
      issues.push({ rowId: row.id, field: 'grade', message: `Grade "${row.grade}" is not a recognized University grade.` });
    }

    const key = `${row.courseCode.trim().toUpperCase()}`;
    const existing = seen.get(key) || [];
    existing.push(row.id);
    seen.set(key, existing);
  }

  for (const [code, ids] of Array.from(seen.entries())) {
    if (ids.length > 1) {
      for (const rowId of ids) {
        issues.push({
          rowId,
          field: 'courseCode',
          message: `Possible duplicate — course ${code} appears ${ids.length} times.`,
        });
      }
    }
  }

  return issues;
}

export async function validateCourseRowsAgainstCatalog(rows: CourseReviewRow[]): Promise<CourseValidationIssue[]> {
  const codes = rows.map((row) => row.courseCode).filter(Boolean);
  const unknownCodes = await findUnknownCourseCodes(codes);
  if (unknownCodes.length === 0) {
    return [];
  }

  const unknownSet = new Set(unknownCodes);
  const issues: CourseValidationIssue[] = [];
  for (const row of rows) {
    const code = row.courseCode.trim().toUpperCase();
    if (code && unknownSet.has(code)) {
      issues.push({
        rowId: row.id,
        field: 'courseCode',
        message: `${code} is not in the University course catalog.`,
      });
    }
  }
  return issues;
}

export function hasHighSeverityRisk(riskLevel: string | null | undefined) {
  return (riskLevel || '').toLowerCase() === 'high';
}

export function hasMissingGrades(rows: CourseReviewRow[]) {
  return rows.some((row) => !row.grade.trim());
}
