export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none bg-white">
      {children}
    </div>
  );
}