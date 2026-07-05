import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/grades/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const url = new URL(request.url);
  const status = (url.searchParams.get('status') || 'pending').trim().toLowerCase();
  const allowedStatus = new Set(['pending', 'reviewing', 'approved', 'rejected']);
  const statusFilter = allowedStatus.has(status) ? status : 'pending';

  const { data, error } = await adminClient
    .from('admin_review_requests')
    .select(
      'id, issue_type, message, external_transcript_url, status, created_at, updated_at, upload_id, user_id, grade_verifications(id, status, transcript_filename, transcript_storage_bucket, transcript_storage_path, risk_level, risk_score), users(full_name, email)'
    )
    .eq('status', statusFilter)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Admin review list fetch error:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch admin review requests.' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { requests: data || [] } }, { status: 200 });
}
