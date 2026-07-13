'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
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
      setError('Please enter your email address.');
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
        setError(result?.error?.message || 'Unable to send reset email right now. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(
        result?.data?.message ||
          'If this email is registered, a password reset link has been sent. Please check your inbox.'
      );
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Unable to send reset email right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Reset Password</h1>
          <p className="text-slate-500">Enter your email to receive a reset link</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-emerald-700 text-sm">{success}</p>
            <p className="mt-1 text-emerald-700 text-xs">
              For security, reset links expire after 60 minutes.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@schooldomain.hk"
              className="w-full"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? 'Sending reset link...' : 'Send Reset Link'}
          </Button>
        </form>

        <p className="text-center text-slate-600 text-sm mt-6">
          Remember your password?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
