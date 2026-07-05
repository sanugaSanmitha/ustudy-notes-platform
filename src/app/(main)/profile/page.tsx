
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser } from '@/types/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      const mapProfile = (profile: {
        id: string;
        email: string;
        full_name?: string | null;
        school?: string | null;
        profile_completed?: boolean | null;
        anonymous_id: string;
        is_seller: boolean;
        is_first_purchase: boolean;
        created_at: string;
        updated_at: string;
      }): AuthUser => ({
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name ?? null,
        school: profile.school ?? null,
        profileCompleted: Boolean(
          profile.profile_completed && profile.full_name?.trim() && profile.school?.trim()
        ),
        anonymousId: profile.anonymous_id,
        isSeller: profile.is_seller,
        isFirstPurchase: profile.is_first_purchase,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      });

      const fetchFromClientSession = async () => {
        const supabase = createClient();

        const {
          data: { user: clientUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !clientUser) {
          router.push('/login');
          return false;
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', clientUser.id)
          .maybeSingle();

        if (profileError) {
          console.error('Client profile fetch error:', profileError);
          return false;
        }

        if (!profile) {
          setError(
            'Your account exists but the profile record is missing. Try registering again or contact support.'
          );
          return true;
        }

        setUser(mapProfile(profile));
        return true;
      };

      try {
        const response = await fetch('/api/auth/profile', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          if (result?.error?.code === 'UNAUTHORIZED') {
            const recoveredFromClient = await fetchFromClientSession();
            if (!recoveredFromClient) {
              router.push('/login');
            }
          } else if (result?.error?.code === 'PROFILE_NOT_FOUND') {
            setError(
              'Your account exists but the profile record is missing. Try registering again or contact support.'
            );
          } else {
            const recoveredFromClient = await fetchFromClientSession();
            if (!recoveredFromClient) {
              setError('Failed to load profile. Please refresh the page and try again.');
            }
          }
          return;
        }

        if (!result?.data) {
          setError('Failed to load profile data. Please refresh the page and try again.');
          return;
        }

        setUser(result.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        const recoveredFromClient = await fetchFromClientSession();
        if (!recoveredFromClient) {
          setError('Unable to load profile right now. Please try again in a moment.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setTimeout(() => {
        router.push('/login');
        router.refresh();
      }, 1200);
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordError('An unexpected error occurred. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="mb-4 text-red-600">{error}</p>
        <Link href="/login" className="text-blue-600 hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="mb-4 text-slate-700">We could not load your profile details.</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Profile</h1>

      <Card className="space-y-4 p-6">
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
          <label className="text-sm font-medium text-slate-600">Anonymous ID</label>
          <p className="text-lg text-slate-900">{user.anonymousId}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Member Since</label>
          <p className="text-lg text-slate-900">
            {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Status</label>
          <p className="text-lg text-slate-900">
            {user.isSeller ? 'Verified Seller' : 'Buyer'}
          </p>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Update Password</h2>

        {passwordError && (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {passwordError}
          </p>
        )}

        {passwordSuccess && (
          <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {passwordSuccess}
          </p>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Current Password
            </Label>
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordInputChange}
              placeholder="Enter current password"
              disabled={passwordLoading}
            />
          </div>

          <div>
            <Label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-slate-700">
              New Password
            </Label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordInputChange}
              placeholder="At least 8 characters"
              disabled={passwordLoading}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Confirm New Password
            </Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordInputChange}
              placeholder="Re-enter new password"
              disabled={passwordLoading}
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={passwordLoading}>
            {passwordLoading ? 'Updating password...' : 'Update Password'}
          </Button>
        </form>
      </Card>

      <div className="mt-6">
        <div className="mb-3 grid gap-3 md:grid-cols-2">
          <Button asChild variant="outline">
            <Link href="/grades/upload">Submit Grades for Verification</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/grades/status">View Grade Verification Status</Link>
          </Button>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full text-red-600 hover:bg-red-50"
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}
