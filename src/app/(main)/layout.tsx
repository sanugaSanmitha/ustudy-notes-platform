import { MainNavbar } from '@/components/layout/MainNavbar';
import { MobileBottomBar } from '@/components/layout/MobileBottomBar';
import { Footer } from '@/components/layout/Footer';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f7]">
      <MainNavbar />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomBar />
    </div>
  );
}
