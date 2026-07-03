import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-slate-900">HKUST Notes Platform</p>
          <p className="mt-1 text-sm text-slate-500">
            Secure note trading for HKUST students.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <Link href="/register" className="hover:text-blue-600">
            Register
          </Link>
          <Link href="/login" className="hover:text-blue-600">
            Log in
          </Link>
          <Link href="/profile" className="hover:text-blue-600">
            Profile
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} HKUST Notes Platform
      </div>
    </footer>
  );
}
