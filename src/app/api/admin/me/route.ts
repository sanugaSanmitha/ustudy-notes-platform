import { NextResponse } from 'next/server';
import {
  isAuthorizedAdmin,
  isAuthorizedAssistant,
  isAuthorizedSupport,
  isAuthorizedVerificationReviewer,
} from '@/lib/auth/admin-access';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function resolveRoles(userId: string) {
  const { data } = await adminClient.from('user_roles').select('role').eq('user_id', userId);
  return (data || []).map((row) => row.role as 'user' | 'support' | 'admin' | 'assistant');
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
  }

  const roles = await resolveRoles(user.id);
  const isAdmin = isAuthorizedAdmin(user.email, roles);
  const isAssistant = isAuthorizedAssistant(user.email, roles);
  const isSupport = isAuthorizedSupport(user.email, roles);
  const isVerificationReviewer = isAuthorizedVerificationReviewer(user.email, roles);

  if (!isAdmin && !isAssistant && !isSupport) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Staff access required' } }, { status: 403 });
  }

  return NextResponse.json({
    data: {
      userId: user.id,
      email: user.email,
      roles,
      isAdmin,
      isAssistant,
      isSupport,
      isVerificationReviewer,
      portalRole: isAdmin ? 'admin' : isAssistant ? 'assistant' : isSupport ? 'support' : 'staff',
    },
  });
}
