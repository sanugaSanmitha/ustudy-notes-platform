export const SCHOOL_OPTIONS = [
  'School of Science',
  'School of Engineering',
  'School of Business and Management',
  'School of Humanities and Social Science',
] as const;

export type SchoolOption = (typeof SCHOOL_OPTIONS)[number];
