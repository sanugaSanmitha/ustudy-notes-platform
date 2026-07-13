import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/register" className="text-sm text-blue-600 hover:underline">
        ← Back to register
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">Privacy Policy</h1>
      <div className="prose prose-slate mt-6 max-w-none text-slate-600">
        <p>
          We collect your university email, profile details, and verification documents to operate the marketplace
          and prevent fraud. Transcript data is used only for seller grade verification and is handled according to
          our retention policies.
        </p>
        <p className="mt-4">
          We do not sell personal data. Service providers such as Supabase, Resend, and Stripe may process data on
          our behalf to deliver authentication, email, and payments.
        </p>
      </div>
    </div>
  );
}
