import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold text-slate-900">
          HKUST Notes Platform
        </h1>
        <p className="mb-8 text-slate-600">
          Share, discover, and manage course notes with your HKUST account.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Register
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}