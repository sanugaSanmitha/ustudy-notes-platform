import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchStudentGradeVerificationSnapshot } from '@/lib/grades/student-status';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const snapshot = await fetchStudentGradeVerificationSnapshot(user.id);

    return NextResponse.json({ data: snapshot }, { status: 200 });
  } catch (error) {
    console.error('Grade status error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch grade status' } },
      { status: 500 }
    );
  }
}
