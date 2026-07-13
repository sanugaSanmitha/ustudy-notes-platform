import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/register" className="text-sm text-blue-600 hover:underline">
        ← Back to register
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">Terms of Service</h1>
      <div className="prose prose-slate mt-6 max-w-none text-slate-600">
        <p>
          UStudy Notes is a marketplace for University students to buy and sell course notes. By creating an account,
          you agree to use the platform responsibly, upload only materials you own or have rights to share, and comply
          with your university&apos;s academic integrity policies.
        </p>
        <p className="mt-4">
          Seller verification, note moderation, and payment processing may change as the platform evolves. We will
          update these terms before major policy changes take effect.
        </p>
      </div>
    </div>
  );
}
