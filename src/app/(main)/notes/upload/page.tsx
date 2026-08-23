import { redirect } from 'next/navigation';
import NotesUploadPage from './NotesUploadClient';
import { getAuthIdentity } from '@/lib/auth/session';
import { getStudentMaterialsSnapshot } from '@/lib/materials/student-materials';

type PageProps = {
  searchParams: { course?: string };
};

export default async function NotesUploadRoutePage({ searchParams }: PageProps) {
  const identity = await getAuthIdentity();
  if (!identity) {
    redirect('/login?next=/notes/upload');
  }

  const result = await getStudentMaterialsSnapshot(identity.id);
  if (!result.ok && result.status === 403) {
    redirect('/grades/upload?reason=seller_required');
  }

  return (
    <NotesUploadPage
      preselectedCourse={(searchParams.course || '').toUpperCase()}
      initialData={
        result.ok
          ? {
              courses: result.data.courses,
              verificationId: result.data.verification?.id || '',
              reuploadWindowLabel: result.data.reuploadWindowLabel,
              reuploadWindowShortLabel: result.data.reuploadWindowShortLabel,
            }
          : {
              courses: [],
              verificationId: '',
              reuploadWindowLabel: '3 minutes',
              reuploadWindowShortLabel: '3 min',
              error: result.message,
            }
      }
    />
  );
}
