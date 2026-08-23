import { MainNavbar } from '@/components/layout/MainNavbar';
import { NavAuthProvider } from '@/components/layout/NavAuthProvider';
import { Footer } from '@/components/layout/Footer';
import { getNavAuthSnapshot } from '@/lib/auth/nav-auth';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialAuth = await getNavAuthSnapshot();

  return (
    <NavAuthProvider initialAuth={initialAuth}>
      <div className="flex min-h-screen min-w-0 flex-col bg-white">
        <MainNavbar />
        <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
        <Footer />
      </div>
    </NavAuthProvider>
  );
}
