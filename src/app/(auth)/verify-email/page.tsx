'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isStaffEmail, staffEmailExceptionMessage } from '@/lib/auth/staff-emails';

const PENDING_EMAIL_KEY = 'pendingVerificationEmail';
const MAX_RESEND_ATTEMPTS_PER_DAY = 3;

function formatSentAt(date: Date) {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getCodeFingerprint(code: string) {
  if (!code) return '';
  if (code.length <= 8) return code;
  return `...${code.slice(-8)}`;
}

function normalizeVerificationToken(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // If user pastes the full verify link, extract the token.
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.searchParams.get('token')?.trim() || trimmed;
    } catch {
      return trimmed;
    }
  }

  // Support users pasting only query text like "token=abc123".
  if (trimmed.startsWith('token=')) {
    return trimmed.slice('token='.length).trim();
  }

  return trimmed;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [success, setSuccess] = useState(false);
  const [lastCodeSentAt, setLastCodeSentAt] = useState<Date | null>(null);
  const [codeFingerprint, setCodeFingerprint] = useState('');

  const syncVerifyEmailUrl = useCallback(
    (options?: { email?: string }) => {
      const params = new URLSearchParams();
      const emailParam = options?.email ?? email;

      if (emailParam) {
        params.set('email', emailParam);
      }

      const query = params.toString();
      router.replace(query ? `/verify-email?${query}` : '/verify-email');
    },
    [email, router]
  );

  const handleVerifyWithToken = useCallback(async (verifyToken: string) => {
    const normalizedToken = normalizeVerificationToken(verifyToken);

    if (!normalizedToken) {
      setError('Please enter a valid verification code');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: normalizedToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error?.message || 'Verification failed');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Verification error:', err);
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const emailFromUrl = searchParams.get('email')?.trim().toLowerCase() || '';
    const storedEmail = sessionStorage.getItem(PENDING_EMAIL_KEY)?.trim().toLowerCase() || '';
    const resolvedEmail = emailFromUrl || storedEmail;

    if (resolvedEmail) {
      setEmail(resolvedEmail);
      sessionStorage.setItem(PENDING_EMAIL_KEY, resolvedEmail);
    }
  }, [searchParams]);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')?.trim() || '';

    if (tokenFromUrl) {
      handleVerifyWithToken(tokenFromUrl);
    }
  }, [searchParams, handleVerifyWithToken]);

  const handleVerifyManually = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!verificationCode) {
      setError('Please enter the verification code');
      setLoading(false);
      return;
    }

    await handleVerifyWithToken(verificationCode);
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setError('');
    setNotice('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Enter your HKUST email address to resend the verification email.');
      setResendLoading(false);
      return;
    }

    if (!isStaffEmail(normalizedEmail) && !/@(connect\.)?ust\.hk$/i.test(normalizedEmail)) {
      setError(
        `Only @ust.hk or @connect.ust.hk email addresses are allowed (except ${staffEmailExceptionMessage()}).`
      );
      setResendLoading(false);
      return;
    }

    sessionStorage.setItem(PENDING_EMAIL_KEY, normalizedEmail);

    if (resendCount >= MAX_RESEND_ATTEMPTS_PER_DAY) {
      setError(`You have exceeded the maximum resend attempts (${MAX_RESEND_ATTEMPTS_PER_DAY} per day). Please try again tomorrow.`);
      setResendLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error?.message || 'Failed to resend email');
        setResendLoading(false);
        return;
      }

      setError('');
      syncVerifyEmailUrl({ email: normalizedEmail });

      const tokenIssuedAt = result.data?.tokenIssuedAt;

      if (!tokenIssuedAt) {
        setVerificationCode('');
        setCodeFingerprint('');
        setLastCodeSentAt(null);
        setNotice(result.data?.message || 'If this email is eligible, we sent a verification email.');
        setTimeout(() => setNotice(''), 5000);
        setResendLoading(false);
        return;
      }

      setResendCount(resendCount + 1);
      setVerificationCode('');
      setCodeFingerprint('');

      const sentDate = new Date(tokenIssuedAt);
      setLastCodeSentAt(sentDate);
      setNotice(
        `New verification email sent at ${formatSentAt(sentDate)}. Check your inbox. Older codes no longer work.`
      );
      setTimeout(() => setNotice(''), 5000);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Resend error:', err);
    }

    setResendLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Verified!</h2>
          <p className="text-slate-600 mb-6">Your account is ready. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Verify Your Email</h1>
          <p className="text-slate-500">
            {email ? `We sent a verification code to ${email}` : 'Verification'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {notice && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{notice}</p>
          </div>
        )}

        <form onSubmit={handleVerifyManually} className="space-y-4">
          <div>
            <Label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">
              Verification Code
            </Label>
            <Input
              id="code"
              type="text"
              value={verificationCode}
              onChange={(e) => {
                const nextCode = e.target.value;
                setVerificationCode(nextCode);
                setCodeFingerprint(getCodeFingerprint(nextCode));
              }}
              placeholder="Paste the code from your email"
              className="w-full"
              disabled={loading}
            />
            {lastCodeSentAt && (
              <p className="text-xs text-slate-600 mt-2">
                Last code sent at {formatSentAt(lastCodeSentAt)}
                {codeFingerprint ? ` - ends with ${codeFingerprint}` : ''}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              You can paste either the token or full verification link. After resend, only the latest code works.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
          <div>
            <Label htmlFor="resend-email" className="block text-sm font-medium text-slate-700 mb-1">
              Email for resend
            </Label>
            <Input
              id="resend-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
              placeholder="your.email@connect.ust.hk"
              className="w-full"
              disabled={resendLoading}
            />
          </div>

          <p className="text-center text-slate-600 text-sm">
            Didn&apos;t receive the email?
          </p>
          <Button
            onClick={handleResendEmail}
            variant="outline"
            className="w-full"
            disabled={resendLoading}
          >
            {resendLoading ? 'Sending...' : 'Resend Verification Email'}
          </Button>
          {resendCount > 0 && (
            <p className="text-xs text-slate-500 mt-2 text-center">
              Resent {resendCount}/{MAX_RESEND_ATTEMPTS_PER_DAY} times today
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
