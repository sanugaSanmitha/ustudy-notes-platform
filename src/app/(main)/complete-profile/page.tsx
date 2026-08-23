import { redirect } from 'next/navigation';
import { CompleteProfileClient } from './CompleteProfileClient';
import { getCurrentAuthUser } from '@/lib/auth/session';

export default async function CompleteProfilePage() {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect('/login?next=/complete-profile');
  }

  if (user.profileCompleted && user.fullName?.trim() && user.school?.trim()) {
    redirect('/');
  }

  return (
    <CompleteProfileClient
      email={user.email}
      fullName={user.fullName?.trim() || ''}
      school={user.school || ''}
    />
  );
}
