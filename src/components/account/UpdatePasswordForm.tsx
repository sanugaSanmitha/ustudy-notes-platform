'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

export function UpdatePasswordForm({ variant = 'page' }: { variant?: 'page' | 'panel' }) {
  const router = useRouter();
  const { t } = useLocale();
  const isPanel = variant === 'panel';
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError(t('passwordAllFields'));
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError(t('passwordMinLength'));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('passwordMismatch'));
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(passwordForm),
      });
      const result = await response.json();
      if (!response.ok) {
        setPasswordError(result.error?.message || t('passwordChangeFailed'));
        return;
      }
      setPasswordSuccess(result.data?.message || 'Password changed successfully. Please log in again.');
      setTimeout(() => {
        router.push('/login');
        router.refresh();
      }, 1200);
    } catch {
      setPasswordError(t('passwordChangeUnexpected'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const errorMessage = passwordError ? (
    <p className={cn(isPanel ? 'mb-2 text-[11px] text-red-600' : 'mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700')}>
      {passwordError}
    </p>
  ) : null;
  const successMessage = passwordSuccess ? (
    <p className={cn(isPanel ? 'mb-2 text-[11px] text-emerald-700' : 'mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700')}>
      {passwordSuccess}
    </p>
  ) : null;

  if (isPanel) {
    return (
      <form onSubmit={handlePasswordChange} className="space-y-0.5">
        {errorMessage}
        {successMessage}
        <div>
          <Label htmlFor="panel-currentPassword" className="text-[12px] font-normal text-[#828282]">
            {t('currentPassword')}
          </Label>
          <Input
            id="panel-currentPassword"
            name="currentPassword"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
            disabled={passwordLoading}
            className="mt-0.5 h-[22px] w-full rounded-[4px] border border-black bg-white px-2 text-[10px] shadow-none focus-visible:ring-0"
            dir="ltr"
            lang="en"
            autoComplete="current-password"
          />
        </div>
        <div>
          <Label htmlFor="panel-newPassword" className="text-[12px] font-normal text-[#828282]">
            {t('newPassword')}
          </Label>
          <Input
            id="panel-newPassword"
            name="newPassword"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
            disabled={passwordLoading}
            className="mt-0.5 h-[22px] w-full rounded-[4px] border border-black bg-white px-2 text-[10px] shadow-none focus-visible:ring-0"
            dir="ltr"
            lang="en"
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label htmlFor="panel-confirmPassword" className="text-[12px] font-normal text-[#828282]">
            {t('confirmPassword')}
          </Label>
          <Input
            id="panel-confirmPassword"
            name="confirmPassword"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            disabled={passwordLoading}
            className="mt-0.5 h-[22px] w-full rounded-[4px] border border-black bg-white px-2 text-[10px] shadow-none focus-visible:ring-0"
            dir="ltr"
            lang="en"
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          disabled={passwordLoading}
          className="mt-1.5 h-7 w-[107px] rounded-[40px] bg-[#1f2f66] text-[10px] font-normal text-white disabled:opacity-60"
        >
          {passwordLoading ? t('updatingPassword') : t('updatePasswordButton')}
        </button>
      </form>
    );
  }

  return (
    <Card className="mt-6 p-6">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">Update Password</h2>
      {errorMessage}
      {successMessage}
      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div>
          <Label htmlFor="currentPassword">Current Password</Label>
          <PasswordInput
            id="currentPassword"
            name="currentPassword"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
            disabled={passwordLoading}
          />
        </div>
        <div>
          <Label htmlFor="newPassword">New Password</Label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
            disabled={passwordLoading}
          />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            disabled={passwordLoading}
          />
        </div>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={passwordLoading}>
          {passwordLoading ? 'Updating password...' : 'Update Password'}
        </Button>
      </form>
    </Card>
  );
}
