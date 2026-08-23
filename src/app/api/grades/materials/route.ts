import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStudentMaterialsSnapshot } from '@/lib/materials/student-materials';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    const verificationId = new URL(request.url).searchParams.get('verificationId');
    const result = await getStudentMaterialsSnapshot(user.id, verificationId);

    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data }, { status: 200 });
  } catch (error) {
    console.error('Materials GET error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load materials.' } }, { status: 500 });
  }
}
