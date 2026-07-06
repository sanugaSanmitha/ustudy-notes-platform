'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AuthUser } from '@/types/auth';

export default function AccountDashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/auth/profile', { cache: 'no-store', credentials: 'same-origin' });
        const result = await response.json().catch(() => null);
        if (response.ok && result?.data) {
          setUser(result.data);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return <p className="text-slate-600">Loading...</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">My Account</h1>
      <p className="mt-2 text-slate-600">Manage your profile, verification, and seller tools in one place.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-slate-500">Account status</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {user?.isSeller ? 'Verified Seller' : 'Buyer (verification required)'}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Email</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{user?.email || '—'}</p>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {user?.isSeller ? (
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/notes/upload">Upload Notes</Link>
            </Button>
          ) : (
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/grades/upload">Verify Seller</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/profile/grade-verification">Grade Verification</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/profile/verified-courses">Verified Courses</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
