'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthIconField } from '@/components/auth/AuthIconField';
import { AuthPasswordField } from '@/components/auth/AuthPasswordField';
import {
  AuthSplitShell,
  authFieldClassName,
  authLabelClassName,
  authOutlineButtonClassName,
  authPrimaryButtonClassName,
} from '@/components/auth/AuthSplitShell';
import { createClient } from '@/lib/supabase/client';
import { getPostLoginPath } from '@/lib/auth/landing';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[13px] leading-5 text-[#d93025]">
      <span
        aria-hidden
        className="inline-flex size-[14px] shrink-0 items-center justify-center rounded-full border border-current text-[9px] font-semibold leading-none"
      >
        !
      </span>
      {message}
    </p>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const nextPath = searchParams.get('next');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'none' | 'verification' | 'credentials' | 'general'>(
    'none'
  );
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const hasCredentialError = errorType === 'credentials' || errorType === 'general';
  const hasVerificationError = errorType === 'verification';
  const showResetPassword = failedAttempts >= 3;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === 'email') {
      setFailedAttempts(0);
    }
    if (error) {
      setError('');
      setErrorType('none');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorType('none');
    setLoading(true);

    if (!formData.email || !formData.password) {
      setError(t('authEnterEmailPassword'));
      setErrorType('credentials');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        const normalizedEmail = formData.email.trim().toLowerCase();
        const needsVerification = signInError.message.includes('Email not confirmed');

        if (needsVerification) {
          setError(t('authVerifyEmailFirst'));
          setErrorType('verification');
        } else {
          setFailedAttempts((count) => count + 1);
          setError(t('authInvalidCredentials'));
          setErrorType('credentials');
        }

        if (needsVerification && normalizedEmail) {
          sessionStorage.setItem('pendingVerificationEmail', normalizedEmail);
        }

        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setError(t('authSessionNotReady'));
        setErrorType('general');
        setLoading(false);
        return;
      }

      const profileResponse = await fetch('/api/auth/profile', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const profileResult = await profileResponse.json().catch(() => ({}));
      const destination = getPostLoginPath({
        profileCompleted: Boolean(profileResult.data?.profileCompleted),
        isAdmin: Boolean(profileResult.data?.isAdmin),
        next: nextPath,
      });

      router.replace(destination);
      router.refresh();
    } catch (err) {
      setFailedAttempts((count) => count + 1);
      setError(t('authInvalidCredentials'));
      setErrorType('general');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  return (
    <AuthSplitShell title={t('authWelcomeTitle')} subtitle={t('authSignInSubtitle')}>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="space-y-1">
          <Label htmlFor="email" className={authLabelClassName}>
            {t('authEmail')}
          </Label>
          <AuthIconField iconSrc="/icons/auth-email.svg" iconWidth={20} iconHeight={16}>
            <Input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@schooldomain.hk"
              className={cn(authFieldClassName, hasCredentialError && 'border border-[#d93025]')}
              disabled={loading}
              autoComplete="email"
            />
          </AuthIconField>
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" className={authLabelClassName}>
            {t('authPassword')}
          </Label>
          <AuthPasswordField
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            disabled={loading}
            autoComplete="current-password"
            className={hasCredentialError ? 'border border-[#d93025]' : undefined}
          />
          <div className="min-h-4">
            {hasCredentialError ? <FieldError message={error} /> : null}
            {hasVerificationError ? <FieldError message={error} /> : null}
            {hasVerificationError && formData.email ? (
              <Link
                href={`/verify-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`}
                className="mt-0.5 inline-block text-[13px] font-medium text-[#004ac6] hover:underline"
              >
                {t('authResendVerification')}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Link
            href={`/forgot-password?email=${encodeURIComponent(formData.email.trim())}`}
            className={cn(
              'shrink-0 text-xs font-semibold tracking-[0.6px] hover:underline',
              hasCredentialError || showResetPassword ? 'text-[#d93025]' : 'text-[#004ac6]'
            )}
          >
            {showResetPassword ? t('authResetPassword') : t('authForgotPassword')}
          </Link>
        </div>

        <Button type="submit" className={authPrimaryButtonClassName} disabled={loading}>
          {loading ? t('authLoggingIn') : t('authLogin')}
        </Button>
      </form>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#c3c6d7]" />
        <span className="text-xs font-semibold tracking-[0.6px] text-[#737686]">{t('authOr')}</span>
        <div className="h-px flex-1 bg-[#c3c6d7]" />
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-center text-sm leading-5 text-[#505f76]">{t('authNewToUstudy')}</p>
        <Button asChild variant="outline" className={authOutlineButtonClassName}>
          <Link href="/register">{t('authCreateAccount')}</Link>
        </Button>
      </div>
    </AuthSplitShell>
  );
}

function LoginFallback() {
  const { t } = useLocale();

  return (
    <AuthSplitShell title={t('authWelcomeTitle')} subtitle={t('authSignInSubtitle')}>
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded-md bg-[#edf0fc]" />
        <div className="h-10 animate-pulse rounded-md bg-[#edf0fc]" />
        <div className="h-10 animate-pulse rounded-md bg-[#213f73]/20" />
      </div>
    </AuthSplitShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
