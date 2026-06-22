
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();

    return NextResponse.json(
      { data: { success: true } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: { code: 'LOGOUT_ERROR', message: 'Failed to logout' } },
      { status: 500 }
    );
  }
}
