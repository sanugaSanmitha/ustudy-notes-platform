'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { RegisterPayload } from '@/types/auth';
import { isStaffEmail, staffEmailExceptionMessage } from '@/lib/auth/staff-emails';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [formData, setFormData] = useState<RegisterPayload>({
    email: '',
    password: '',
    agreeToTerms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.email) {
      setError(t('authEmailRequired'));
      setLoading(false);
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();
    if (!isStaffEmail(normalizedEmail) && !/@(connect\.)?ust\.hk$/i.test(normalizedEmail)) {
      setError(
        t('authEmailDomainOnly').replace('{exception}', staffEmailExceptionMessage())
      );
      setLoading(false);
      return;
    }

    if (!formData.password) {
      setError(t('authPasswordRequired'));
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError(t('authPasswordMin8'));
      setLoading(false);
      return;
    }

    if (!formData.agreeToTerms) {
      setError(t('authAgreeTermsRequired'));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error?.message || t('authRegistrationFailed'));
        setLoading(false);
        return;
      }

      const requiresVerification = result.data?.requiresVerification !== false;
      if (!requiresVerification) {
        router.push('/login');
        return;
      }

      sessionStorage.setItem('pendingVerificationEmail', normalizedEmail);
      router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err) {
      setError(t('updateNameUnexpected'));
      console.error('Registration error:', err);
      setLoading(false);
    }
  };

  return (
    <AuthSplitShell title={t('authRegisterTitle')} subtitle={t('authRegisterSubtitle')}>
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

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
              className={authFieldClassName}
              disabled={loading}
              autoComplete="email"
            />
          </AuthIconField>
          <p className="text-xs text-[#505f76]">{t('authRegisterEmailHint')}</p>
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
            autoComplete="new-password"
          />
          <p className="text-xs text-[#505f76]">{t('authPasswordMinHint')}</p>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="agreeToTerms"
            checked={formData.agreeToTerms}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({
                ...prev,
                agreeToTerms: checked === true,
              }))
            }
            disabled={loading}
            className="mt-0.5 border-[#c3c6d7] bg-white"
          />
          <Label htmlFor="agreeToTerms" className="cursor-pointer text-sm font-normal leading-5 text-[#505f76]">
            {t('authAgreeTermsPrefix')}{' '}
            <Link href="/terms" className="font-semibold text-[#004ac6] hover:underline">
              {t('authTermsOfService')}
            </Link>{' '}
            {t('authAnd')}{' '}
            <Link href="/privacy" className="font-semibold text-[#004ac6] hover:underline">
              {t('authPrivacyPolicy')}
            </Link>
          </Label>
        </div>

        <Button type="submit" className={authPrimaryButtonClassName} disabled={loading}>
          {loading ? t('authCreatingAccount') : t('authCreateAccount')}
        </Button>
      </form>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#c3c6d7]" />
        <span className="text-xs font-semibold tracking-[0.6px] text-[#737686]">{t('authOr')}</span>
        <div className="h-px flex-1 bg-[#c3c6d7]" />
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-center text-sm leading-5 text-[#505f76]">{t('authAlreadyHaveAccount')}</p>
        <Button asChild variant="outline" className={authOutlineButtonClassName}>
          <Link href="/login">{t('authLogin')}</Link>
        </Button>
      </div>
    </AuthSplitShell>
  );
}
