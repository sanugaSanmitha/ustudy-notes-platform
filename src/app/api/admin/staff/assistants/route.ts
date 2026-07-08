import { NextResponse } from 'next/server';
import { requireAdminUser, listVerificationStaff } from '@/lib/grades/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: auth.message } }, { status: auth.status });
  }

  const staff = await listVerificationStaff(['assistant', 'support', 'admin']);
  return NextResponse.json(
    {
      data: {
        assistants: staff.filter((member) => member.roles.includes('assistant')),
        staff,
      },
    },
    { status: 200 }
  );
}
