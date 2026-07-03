import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: {
        code: 'LOGIN_API_DISABLED',
        message: 'Use the browser Supabase client for login.',
      },
    },
    { status: 410 }
  );
}
