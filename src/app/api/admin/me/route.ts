import { NextResponse } from 'next/server';
import {
  isAuthorizedAdmin,
  isAuthorizedAssistant,
  isAuthorizedSupport,
  isAuthorizedVerificationReviewer,
} from '@/lib/auth/admin-access';
import { getAuthIdentity } from '@/lib/auth/session';
import { resolveUserRoles } from '@/lib/grades/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const identity = await getAuthIdentity();
  if (!identity) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
  }

  const roles = await resolveUserRoles(identity.id);
  const isAdmin = isAuthorizedAdmin(identity.email, roles);
  const isAssistant = isAuthorizedAssistant(identity.email, roles);
  const isSupport = isAuthorizedSupport(identity.email, roles);
  const isVerificationReviewer = isAuthorizedVerificationReviewer(identity.email, roles);

  if (!isAdmin && !isAssistant && !isSupport) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Staff access required' } }, { status: 403 });
  }

  return NextResponse.json({
    data: {
      userId: identity.id,
      email: identity.email,
      roles,
      isAdmin,
      isAssistant,
      isSupport,
      isVerificationReviewer,
      portalRole: isAdmin ? 'admin' : isAssistant ? 'assistant' : isSupport ? 'support' : 'staff',
    },
  });
}
