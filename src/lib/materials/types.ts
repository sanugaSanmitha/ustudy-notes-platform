export type CourseMaterialInfo = {
  id: string;
  uploadedAt: string;
  zipFilename: string;
  zipSizeBytes: number;
  zipFileNames: string[];
  version: number;
  downloadCount: number;
  isLocked: boolean;
  timeRemaining: number;
};

export type CourseWithMaterial = {
  courseCode: string;
  courseName: string;
  grade: string;
  academicYear: string | null;
  semester: string | null;
  material: CourseMaterialInfo | null;
};
