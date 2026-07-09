import { adminClient } from '@/lib/supabase/admin';
import { isMaterialLocked } from '@/lib/materials/lock';

export type AdminMaterialListItem = {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  verificationId: string;
  courseCode: string;
  courseName: string;
  grade: string;
  zipFilename: string;
  zipSizeBytes: number;
  zipFileNames: string[];
  uploadedAt: string;
  lockedAt: string | null;
  isLocked: boolean;
  version: number;
  downloadCount: number;
};

export async function listAdminMaterials(options: {
  search?: string;
  locked?: 'all' | 'locked' | 'unlocked';
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = adminClient
    .from('course_materials')
    .select(
      `
        id,
        user_id,
        verification_id,
        course_code,
        course_name,
        grade,
        zip_filename,
        zip_size_bytes,
        zip_file_names,
        uploaded_at,
        locked_at,
        is_locked,
        version,
        download_count
      `,
      { count: 'exact' }
    )
    .order('uploaded_at', { ascending: false })
    .range(from, to);

  if (options.locked === 'locked') {
    query = query.eq('is_locked', true);
  } else if (options.locked === 'unlocked') {
    query = query.eq('is_locked', false);
  }

  const search = options.search?.trim();
  if (search) {
    query = query.or(`course_code.ilike.%${search}%,course_name.ilike.%${search}%,zip_filename.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return { ok: false as const, error };
  }

  const userIds = Array.from(new Set((data || []).map((row) => row.user_id)));
  const usersById = new Map<string, { email: string | null; full_name: string | null }>();

  if (userIds.length > 0) {
    const { data: users } = await adminClient.from('users').select('id, email, full_name').in('id', userIds);
    (users || []).forEach((user) => {
      usersById.set(user.id, { email: user.email, full_name: user.full_name });
    });
  }

  const materials: AdminMaterialListItem[] = (data || []).map((row) => {
    const user = usersById.get(row.user_id);
    const locked = isMaterialLocked(row.uploaded_at, row.is_locked);

    return {
      id: row.id,
      userId: row.user_id,
      userEmail: user?.email || null,
      userName: user?.full_name || null,
      verificationId: row.verification_id,
      courseCode: row.course_code,
      courseName: row.course_name,
      grade: row.grade,
      zipFilename: row.zip_filename,
      zipSizeBytes: row.zip_size_bytes,
      zipFileNames: Array.isArray(row.zip_file_names) ? row.zip_file_names : [],
      uploadedAt: row.uploaded_at,
      lockedAt: row.locked_at,
      isLocked: locked,
      version: row.version,
      downloadCount: row.download_count || 0,
    };
  });

  const total = count || 0;

  return {
    ok: true as const,
    materials,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function recordMaterialDownload(materialId: string, downloadedBy: string | null, source: 'student' | 'admin' | 'staff') {
  const { data: material, error: fetchError } = await adminClient
    .from('course_materials')
    .select('id, download_count')
    .eq('id', materialId)
    .maybeSingle();

  if (fetchError || !material) {
    return { ok: false as const, error: fetchError || new Error('Material not found') };
  }

  const nowIso = new Date().toISOString();

  const { error: insertError } = await adminClient.from('material_downloads').insert({
    material_id: materialId,
    downloaded_by: downloadedBy,
    source,
    downloaded_at: nowIso,
  });

  if (insertError) {
    return { ok: false as const, error: insertError };
  }

  const { error: updateError } = await adminClient
    .from('course_materials')
    .update({
      download_count: (material.download_count || 0) + 1,
      updated_at: nowIso,
    })
    .eq('id', materialId);

  if (updateError) {
    return { ok: false as const, error: updateError };
  }

  return { ok: true as const, downloadCount: (material.download_count || 0) + 1 };
}
