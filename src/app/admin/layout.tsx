import { AdminPortalProvider } from '@/components/admin/admin-portal-context';
import { AdminEnglishScope } from '@/components/i18n/AdminEnglishScope';
import { getAdminPortalSnapshot } from '@/lib/auth/staff-session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const snapshot = await getAdminPortalSnapshot();

  return (
    <AdminEnglishScope>
      <AdminPortalProvider
        initialPortalRole={snapshot.portalRole}
        initialUserId={snapshot.userId}
        initialStaff={snapshot.staff}
        staffPrefetched={snapshot.portalRole === 'admin'}
      >
        {children}
      </AdminPortalProvider>
    </AdminEnglishScope>
  );
}
