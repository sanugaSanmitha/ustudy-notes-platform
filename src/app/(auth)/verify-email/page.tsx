'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/components/i18n/LocaleProvider';
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

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.searchParams.get('token')?.trim() || trimmed;
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith('token=')) {
    return trimmed.slice('token='.length).trim();
  }

  return trimmed;
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailFallback() {
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
        <div className="h-8 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 h-10 animate-pulse rounded-md bg-slate-100" />
        <p className="sr-only">{t('authVerifyTitle')}</p>
      </div>
    </div>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();

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
      setError(t('authInvalidVerificationCode'));
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
        setError(result.error?.message || t('authVerificationFailed'));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(t('updateNameUnexpected'));
      console.error('Verification error:', err);
      setLoading(false);
    }
  }, [router, t]);

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
      setError(t('authEnterVerificationCode'));
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
      setError(t('authEnterEmailForResend'));
      setResendLoading(false);
      return;
    }

    if (!isStaffEmail(normalizedEmail) && !/@(connect\.)?ust\.hk$/i.test(normalizedEmail)) {
      setError(t('authEmailDomainOnly').replace('{exception}', staffEmailExceptionMessage()));
      setResendLoading(false);
      return;
    }

    sessionStorage.setItem(PENDING_EMAIL_KEY, normalizedEmail);

    if (resendCount >= MAX_RESEND_ATTEMPTS_PER_DAY) {
      setError(t('authResendMaxExceeded').replace('{max}', String(MAX_RESEND_ATTEMPTS_PER_DAY)));
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
        setError(result.error?.message || t('authResendFailed'));
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
        setNotice(result.data?.message || t('authResendEligible'));
        setTimeout(() => setNotice(''), 5000);
        setResendLoading(false);
        return;
      }

      setResendCount(resendCount + 1);
      setVerificationCode('');
      setCodeFingerprint('');

      const sentDate = new Date(tokenIssuedAt);
      setLastCodeSentAt(sentDate);
      setNotice(t('authNewVerificationSent').replace('{time}', formatSentAt(sentDate)));
      setTimeout(() => setNotice(''), 5000);
    } catch (err) {
      setError(t('updateNameUnexpected'));
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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('authVerifySuccessTitle')}</h2>
          <p className="text-slate-600 mb-6">{t('authVerifySuccessBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('authVerifyTitle')}</h1>
          <p className="text-slate-500">
            {email ? t('authVerifySentTo').replace('{email}', email) : t('authVerification')}
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
              {t('authVerificationCode')}
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
              placeholder={t('authPasteCodePlaceholder')}
              className="w-full"
              disabled={loading}
            />
            {lastCodeSentAt && (
              <p className="text-xs text-slate-600 mt-2">
                {t('authLastCodeSentAt').replace('{time}', formatSentAt(lastCodeSentAt))}
                {codeFingerprint
                  ? ` — ${t('authCodeEndsWith').replace('{fingerprint}', codeFingerprint)}`
                  : ''}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">{t('authVerifyCodeHint')}</p>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading}
          >
            {loading ? t('authVerifying') : t('authVerifyEmail')}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
          <div>
            <Label htmlFor="resend-email" className="block text-sm font-medium text-slate-700 mb-1">
              {t('authEmailForResend')}
            </Label>
            <Input
              id="resend-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
              placeholder="your.email@schooldomain.hk"
              className="w-full"
              disabled={resendLoading}
            />
          </div>

          <p className="text-center text-slate-600 text-sm">{t('authDidntReceiveEmail')}</p>
          <Button
            onClick={handleResendEmail}
            variant="outline"
            className="w-full"
            disabled={resendLoading}
          >
            {resendLoading ? t('authSending') : t('authResendVerificationEmail')}
          </Button>
          {resendCount > 0 && (
            <p className="text-xs text-slate-500 mt-2 text-center">
              {t('authResentCount')
                .replace('{count}', String(resendCount))
                .replace('{max}', String(MAX_RESEND_ATTEMPTS_PER_DAY))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
