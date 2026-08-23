import { adminClient } from '@/lib/supabase/admin';
import { getGradeTier } from '@/lib/materials/grade-tiers';
import {
  formatMaterialReuploadWindowLabel,
  formatMaterialReuploadWindowShortLabel,
  materialUploadConfig,
} from '@/lib/materials/config';
import { getReuploadTimeRemaining, isMaterialLocked } from '@/lib/materials/lock';
import type { CourseWithMaterial } from '@/lib/materials/types';

type CourseMaterialRow = {
  id: string;
  user_id: string;
  verification_id: string;
  course_code: string;
  course_name: string;
  grade: string;
  zip_filename: string;
  zip_size_bytes: number;
  zip_storage_bucket: string | null;
  zip_storage_path: string | null;
  zip_file_names: string[] | null;
  download_count: number | null;
  uploaded_at: string;
  locked_at: string | null;
  is_locked: boolean;
  version: number;
};

export type StudentMaterialsSnapshot = {
  verifications: Array<{ id: string; status: string; created_at: string; reviewed_at: string | null }>;
  verification: { id: string; status: string; created_at: string; reviewed_at: string | null } | null;
  courses: CourseWithMaterial[];
  materials: Array<
    CourseMaterialRow & {
      gradeTier: ReturnType<typeof getGradeTier>;
      timeRemaining: number;
      zipFileNames: string[];
    }
  >;
  reuploadWindowSeconds: number;
  reuploadWindowLabel: string;
  reuploadWindowShortLabel: string;
};

const emptySnapshot = (): StudentMaterialsSnapshot => ({
  verifications: [],
  verification: null,
  courses: [],
  materials: [],
  reuploadWindowSeconds: materialUploadConfig.reuploadWindowSeconds,
  reuploadWindowLabel: formatMaterialReuploadWindowLabel(),
  reuploadWindowShortLabel: formatMaterialReuploadWindowShortLabel(),
});

export async function getStudentMaterialsSnapshot(
  userId: string,
  verificationId?: string | null
): Promise<{ ok: true; data: StudentMaterialsSnapshot } | { ok: false; status: number; code: string; message: string }> {
  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('is_seller')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('Materials profile error:', profileError);
    return { ok: false, status: 500, code: 'FETCH_ERROR', message: 'Failed to verify seller status.' };
  }

  if (!profile?.is_seller) {
    return {
      ok: false,
      status: 403,
      code: 'SELLER_REQUIRED',
      message: 'Complete grade verification before uploading materials.',
    };
  }

  let verificationQuery = adminClient
    .from('grade_verifications')
    .select('id, status, created_at, reviewed_at')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false });

  if (verificationId) {
    verificationQuery = verificationQuery.eq('id', verificationId);
  }

  const { data: verifications, error: verificationError } = await verificationQuery;

  if (verificationError) {
    console.error('Materials verification error:', verificationError);
    return { ok: false, status: 500, code: 'FETCH_ERROR', message: 'Failed to load verifications.' };
  }

  const approvedVerifications = verifications || [];
  const activeVerification = approvedVerifications[0] || null;

  if (!activeVerification) {
    return { ok: true, data: emptySnapshot() };
  }

  const targetVerificationId = verificationId || activeVerification.id;

  const [{ data: verifiedCourses, error: coursesError }, { data: materials, error: materialsError }] = await Promise.all([
    adminClient
      .from('verified_courses')
      .select('course_code, course_name, grade, verification_id, academic_year, semester')
      .eq('user_id', userId)
      .eq('verification_id', targetVerificationId)
      .order('course_code', { ascending: true }),
    adminClient
      .from('course_materials')
      .select('*')
      .eq('user_id', userId)
      .eq('verification_id', targetVerificationId)
      .order('course_code', { ascending: true }),
  ]);

  if (coursesError) {
    console.error('Materials verified courses error:', coursesError);
    return { ok: false, status: 500, code: 'FETCH_ERROR', message: 'Failed to load verified courses.' };
  }

  if (materialsError) {
    console.error('Materials fetch error:', materialsError);
    return {
      ok: false,
      status: 500,
      code: 'FETCH_ERROR',
      message: 'Failed to load materials. Run docs/migrations/022_course_materials.sql in Supabase SQL Editor.',
    };
  }

  const materialByCourse = new Map((materials || []).map((row) => [row.course_code, row as CourseMaterialRow]));
  const nowIso = new Date().toISOString();

  const enrichedMaterials = await Promise.all(
    (materials || []).map(async (material) => {
      const row = material as CourseMaterialRow;
      const locked = isMaterialLocked(row.uploaded_at, row.is_locked);

      if (locked && !row.is_locked) {
        await adminClient
          .from('course_materials')
          .update({
            is_locked: true,
            locked_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', row.id);
      }

      return {
        ...row,
        is_locked: locked,
        gradeTier: getGradeTier(row.grade),
        timeRemaining: getReuploadTimeRemaining(row.uploaded_at, locked),
        zipFileNames: Array.isArray(row.zip_file_names) ? row.zip_file_names : [],
      };
    })
  );

  const courses: CourseWithMaterial[] = (verifiedCourses || []).map((course) => {
    const material = materialByCourse.get(course.course_code);
    const locked = material ? isMaterialLocked(material.uploaded_at, material.is_locked) : false;

    return {
      courseCode: course.course_code,
      courseName: course.course_name || course.course_code,
      grade: course.grade,
      academicYear: course.academic_year,
      semester: course.semester,
      material: material
        ? {
            id: material.id,
            uploadedAt: material.uploaded_at,
            zipFilename: material.zip_filename,
            zipSizeBytes: material.zip_size_bytes,
            zipFileNames: Array.isArray(material.zip_file_names) ? material.zip_file_names : [],
            version: material.version,
            downloadCount: material.download_count || 0,
            isLocked: locked,
            timeRemaining: getReuploadTimeRemaining(material.uploaded_at, locked),
          }
        : null,
    };
  });

  return {
    ok: true,
    data: {
      verifications: approvedVerifications,
      verification: activeVerification,
      courses,
      materials: enrichedMaterials,
      reuploadWindowSeconds: materialUploadConfig.reuploadWindowSeconds,
      reuploadWindowLabel: formatMaterialReuploadWindowLabel(),
      reuploadWindowShortLabel: formatMaterialReuploadWindowShortLabel(),
    },
  };
}
