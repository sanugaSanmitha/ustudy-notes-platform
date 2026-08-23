import { redirect } from 'next/navigation';
import { GradeVerificationDetailView } from '@/components/grades/GradeVerificationDetailView';
import { getAuthIdentity } from '@/lib/auth/session';
import { fetchStudentGradeVerificationSnapshot } from '@/lib/grades/student-status';

export default async function GradeVerificationAccountPage() {
  const identity = await getAuthIdentity();
  if (!identity) {
    redirect('/login?next=/profile/grade-verification');
  }

  const snapshot = await fetchStudentGradeVerificationSnapshot(identity.id);

  return <GradeVerificationDetailView initialSnapshot={snapshot} />;
}
