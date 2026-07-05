'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      setError('Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || 'Unable to update password. Please request a new reset link.');
        setLoading(false);
        return;
      }

      setSuccess('Password updated successfully. Redirecting to login...');

      await supabase.auth.signOut();

      setTimeout(() => {
        router.replace('/login');
        router.refresh();
      }, 1200);
    } catch (err) {
      console.error('Update password error:', err);
      setError('Unable to update password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Set New Password</h1>
          <p className="text-slate-500">Choose a new password for your account</p>
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
          <p className="text-center text-sm text-slate-600">Validating reset link...</p>
        ) : !hasRecoverySession ? (
          <div className="space-y-4">
            <p className="text-center text-sm text-slate-600">
              Reset links expire after 60 minutes. Request a new link to continue.
            </p>
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/forgot-password">Request New Reset Link</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1">
              New Password
            </Label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
              Confirm New Password
            </Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? 'Updating password...' : 'Update Password'}
          </Button>
          <p className="text-xs text-slate-500">
            This reset link expires 60 minutes after it is issued.
          </p>
          </form>
        )}

        <p className="text-center text-slate-600 text-sm mt-6">
          Back to{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
