import { redirect } from 'next/navigation';
import { AdminDashboardClient } from './AdminDashboardClient';
import { getAdminDashboardData } from '@/lib/admin/dashboard';
import { requireAdminUser } from '@/lib/grades/admin';

export default async function AdminDashboardPage() {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    redirect(auth.status === 401 ? '/login?next=/admin' : '/');
  }

  let initialData = null;
  try {
    initialData = await getAdminDashboardData();
  } catch (error) {
    console.error('Admin dashboard load error:', error);
  }

  return <AdminDashboardClient initialData={initialData} />;
}
