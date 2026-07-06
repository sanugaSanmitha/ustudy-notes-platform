'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import type { AuthUser } from '@/types/auth';

export default function PersonalInformationPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/profile', { credentials: 'same-origin', cache: 'no-store' });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          if (result?.error?.code === 'UNAUTHORIZED') router.push('/login');
          return;
        }
        setUser(result.data);
      } finally {
        setLoading(false);
      }
    };
    void fetchUser();
  }, [router]);

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
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
        setPasswordError(result.error?.message || 'Failed to change password.');
        return;
      }
      setPasswordSuccess(result.data?.message || 'Password changed successfully. Please log in again.');
      setTimeout(() => {
        router.push('/login');
        router.refresh();
      }, 1200);
    } catch {
      setPasswordError('An unexpected error occurred. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) return <p className="text-slate-600">Loading...</p>;
  if (!user) return <p className="text-slate-600">Unable to load personal information.</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Personal Information</h1>
      <Card className="mt-6 space-y-4 p-6">
        <div>
          <label className="text-sm font-medium text-slate-600">Email</label>
          <p className="text-lg text-slate-900">{user.email}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Full Name</label>
          <p className="text-lg text-slate-900">{user.fullName || 'Not provided'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">School</label>
          <p className="text-lg text-slate-900">{user.school || 'Not provided'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Member Since</label>
          <p className="text-lg text-slate-900">{new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Update Password</h2>
        {passwordError && <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{passwordError}</p>}
        {passwordSuccess && <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{passwordSuccess}</p>}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <PasswordInput id="currentPassword" name="currentPassword" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} disabled={passwordLoading} />
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <PasswordInput id="newPassword" name="newPassword" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} disabled={passwordLoading} />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <PasswordInput id="confirmPassword" name="confirmPassword" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} disabled={passwordLoading} />
          </div>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={passwordLoading}>
            {passwordLoading ? 'Updating password...' : 'Update Password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
