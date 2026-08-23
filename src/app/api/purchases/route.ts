import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPaidPurchasesForUser } from '@/lib/orders/access';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
  }

  try {
    const items = await getPaidPurchasesForUser(user.id);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to load purchases.' } }, { status: 500 });
  }
}
