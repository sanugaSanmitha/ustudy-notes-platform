'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryChecking, setRecoveryChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const supabase = createClient();

    const checkRecoveryState = async () => {
      const code = searchParams.get('code');

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('Recovery code exchange error:', exchangeError);
        }
      } else if (typeof window !== 'undefined') {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');

        if (accessToken && refreshToken && hashType === 'recovery') {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Recovery session setup error:', sessionError);
          }
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      setHasRecoverySession(Boolean(session));
      setRecoveryChecking(false);

      if (typeof window !== 'undefined') {
        const cleanedUrl = new URL(window.location.href);
        let shouldReplaceUrl = false;

        if (cleanedUrl.searchParams.has('code')) {
          cleanedUrl.searchParams.delete('code');
          shouldReplaceUrl = true;
        }

        if (cleanedUrl.searchParams.has('type')) {
          cleanedUrl.searchParams.delete('type');
          shouldReplaceUrl = true;
        }

        if (cleanedUrl.hash) {
          cleanedUrl.hash = '';
          shouldReplaceUrl = true;
        }

        if (shouldReplaceUrl) {
          window.history.replaceState({}, '', `${cleanedUrl.pathname}${cleanedUrl.search}`);
        }
      }
    };

    checkRecoveryState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasRecoverySession(true);
      } else {
        setHasRecoverySession(Boolean(session));
      }
      setRecoveryChecking(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError(t('authFillBothPasswordFields'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('authPasswordMin8'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('authPasswordsDoNotMatch'));
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || t('authUpdatePasswordFailed'));
        setLoading(false);
        return;
      }

      setSuccess(t('authPasswordUpdatedSuccess'));

      await supabase.auth.signOut();

      setTimeout(() => {
        router.replace('/login');
        router.refresh();
      }, 1200);
    } catch (err) {
      console.error('Update password error:', err);
      setError(t('authUpdatePasswordFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('authSetNewPasswordTitle')}</h1>
          <p className="text-slate-500">{t('authSetNewPasswordSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-emerald-700 text-sm">{success}</p>
          </div>
        )}

        {recoveryChecking ? (
          <p className="text-center text-sm text-slate-600">{t('authValidatingResetLink')}</p>
        ) : !hasRecoverySession ? (
          <div className="space-y-4">
            <p className="text-center text-sm text-slate-600">{t('authResetLinkExpired')}</p>
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/forgot-password">{t('authRequestNewResetLink')}</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1">
              {t('newPassword')}
            </Label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('authNewPasswordPlaceholder')}
              className="w-full"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
              {t('confirmPassword')}
            </Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('authConfirmPasswordPlaceholder')}
              className="w-full"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? t('updatingPassword') : t('updatePasswordButton')}
          </Button>
          <p className="text-xs text-slate-500">{t('authResetLinkExpiryNote')}</p>
          </form>
        )}

        <p className="text-center text-slate-600 text-sm mt-6">
          {t('authBackToLoginPrefix')}{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            {t('authLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
