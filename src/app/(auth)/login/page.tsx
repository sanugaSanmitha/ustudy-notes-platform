
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'none' | 'verification' | 'credentials' | 'general'>(
    'none'
  );
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
    setErrorType('none');
    setLoading(true);

    if (!formData.email || !formData.password) {
      setError('Please enter email and password');
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
          setError('Please verify your email before logging in.');
          setErrorType('verification');
        } else {
          setError('Invalid email or password.');
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
        setError('Login succeeded but session is not ready yet. Please try again.');
        setLoading(false);
        return;
      }

      router.replace('/');
      router.refresh();
    } catch (err) {
      setError('Invalid email or password.');
      setErrorType('general');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          aria-label="Close and go to homepage"
          className="absolute right-0 top-0 rounded-md px-3 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          X
        </Link>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Log In</h1>
          <p className="text-slate-500">Access your HKUST Notes account</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
            <p className="text-red-700 text-sm">{error}</p>
            {errorType === 'verification' && formData.email && (
              <Link
                href={`/verify-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Resend verification email
              </Link>
            )}
            {(errorType === 'credentials' || errorType === 'general') && (
              <div className="space-y-2">
                <p className="text-sm text-red-700">
                  Forgot your password?
                </p>
                <Button asChild variant="outline" size="sm" className="border-red-200">
                  <Link href={`/forgot-password?email=${encodeURIComponent(formData.email.trim())}`}>
                    Reset Password
                  </Link>
                </Button>
              </div>
            )}
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
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@connect.ust.hk"
              className="w-full"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </Label>
            <PasswordInput
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full"
              disabled={loading}
            />
            <div className="mt-2 text-right">
              <Link
                href={`/forgot-password?email=${encodeURIComponent(formData.email.trim())}`}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

        <p className="text-center text-slate-600 text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}