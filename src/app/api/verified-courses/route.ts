import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    const { data, error } = await adminClient
      .from('verified_courses')
      .select('id, course_code, course_name, grade, academic_year, semester, verified_at')
      .eq('user_id', user.id)
      .order('course_code', { ascending: true });

    if (error) {
      console.error('Verified courses fetch error:', error);
      return NextResponse.json(
        {
          error: {
            code: 'FETCH_ERROR',
            message:
              'Failed to load verified courses. Run docs/migrations/015_verified_courses.sql in Supabase SQL Editor.',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { courses: data || [] } }, { status: 200 });
  } catch (error) {
    console.error('Verified courses error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load verified courses.' } }, { status: 500 });
  }
}
