
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AuthUser } from '@/types/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/profile', {
          credentials: 'same-origin',
        });
        const result = await response.json();

        if (!response.ok) {
          if (result.error?.code === 'PROFILE_NOT_FOUND') {
            setError(
              'Your account exists but the profile record is missing. Try registering again or contact support.'
            );
          } else {
            router.push('/login');
          }
          return;
        }

        setUser(result.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        router.push('/login');
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
    return null;
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

      <div className="mt-6">
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
