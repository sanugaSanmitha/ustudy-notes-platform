'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthIconField } from '@/components/auth/AuthIconField';
import {
  AuthSplitShell,
  authFieldClassName,
  authLabelClassName,
  authOutlineButtonClassName,
  authPrimaryButtonClassName,
} from '@/components/auth/AuthSplitShell';
import { useLocale } from '@/components/i18n/LocaleProvider';

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordFallback() {
  const { t } = useLocale();

  return (
    <AuthSplitShell title={t('authForgotPasswordTitle')} subtitle={t('authForgotPasswordSubtitle')}>
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded-md bg-[#edf0fc]" />
        <div className="h-10 animate-pulse rounded-md bg-[#213f73]/20" />
      </div>
    </AuthSplitShell>
  );
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const presetEmail = searchParams.get('email');
    if (presetEmail) {
      setEmail(presetEmail);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError(t('authEnterEmail'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error?.message || t('authResetEmailFailed'));
        setLoading(false);
        return;
      }

      setSuccess(result?.data?.message || t('authResetEmailSuccess'));
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(t('authResetEmailFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitShell title={t('authForgotPasswordTitle')} subtitle={t('authForgotPasswordSubtitle')}>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">{success}</p>
          <p className="mt-1 text-xs text-emerald-700">{t('authResetLinkExpiry')}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="email" className={authLabelClassName}>
            {t('authEmail')}
          </Label>
          <AuthIconField iconSrc="/icons/auth-email.svg" iconWidth={20} iconHeight={16}>
            <Input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@schooldomain.hk"
              className={authFieldClassName}
              disabled={loading}
              autoComplete="email"
            />
          </AuthIconField>
        </div>

        <div className="pt-4">
          <Button type="submit" className={authPrimaryButtonClassName} disabled={loading}>
            {loading ? t('authSendingResetLink') : t('authSendResetLink')}
          </Button>
        </div>
      </form>

      <div className="mt-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-[#c3c6d7]" />
        <span className="text-xs font-semibold tracking-[0.6px] text-[#737686]">{t('authOr')}</span>
        <div className="h-px flex-1 bg-[#c3c6d7]" />
      </div>

      <div className="mt-4 space-y-4">
        <p className="text-center text-base leading-6 text-[#505f76]">{t('authRememberPassword')}</p>
        <Button asChild variant="outline" className={authOutlineButtonClassName}>
          <Link href="/login">{t('authBackToLogin')}</Link>
        </Button>
      </div>
    </AuthSplitShell>
  );
}

