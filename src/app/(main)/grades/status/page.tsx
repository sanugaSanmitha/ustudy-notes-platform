import { redirect } from 'next/navigation';
import { GradeVerificationDetailView } from '@/components/grades/GradeVerificationDetailView';
import { getAuthIdentity } from '@/lib/auth/session';
import { fetchStudentGradeVerificationSnapshot } from '@/lib/grades/student-status';

export default async function GradeStatusPage() {
  const identity = await getAuthIdentity();
  if (!identity) {
    redirect('/login?next=/grades/status');
  }

  const snapshot = await fetchStudentGradeVerificationSnapshot(identity.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <GradeVerificationDetailView
        initialSnapshot={snapshot}
        title="Grade Verification Status"
        description="Track your latest submission and review progress."
      />
    </div>
  );
}
