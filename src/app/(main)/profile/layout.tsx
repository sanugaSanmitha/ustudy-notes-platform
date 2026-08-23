import { AccountSidebar } from '@/components/account/AccountSidebar';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:gap-6 md:py-8">
      <AccountSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
