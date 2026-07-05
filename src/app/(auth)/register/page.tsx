
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { RegisterPayload } from '@/types/auth';

const ALLOWED_NON_HKUST_EMAILS = new Set([
  'support@ustudy.dev',
  'admin@ustudy.dev',
]);

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterPayload>({
    email: '',
    password: '',
    agreeToTerms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Client-side validation
    if (!formData.email) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();
    if (!ALLOWED_NON_HKUST_EMAILS.has(normalizedEmail) && !/@(connect\.)?ust\.hk$/i.test(normalizedEmail)) {
      setError(
        'Only HKUST emails (@ust.hk or @connect.ust.hk) are allowed, except support@ustudy.dev and admin@ustudy.dev.'
      );
      setLoading(false);
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (!formData.agreeToTerms) {
      setError('You must agree to the terms and conditions');
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
        setError(result.error?.message || 'Registration failed');
        setLoading(false);
        return;
      }

      const requiresVerification = result.data?.requiresVerification !== false;
      if (!requiresVerification) {
        router.push('/login');
        return;
      }

      // Redirect to verification page only when token issuance is required.
      sessionStorage.setItem('pendingVerificationEmail', normalizedEmail);
      router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Registration error:', err);
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Register</h1>
          <p className="text-slate-500">Create your HKUST Notes account</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
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
              placeholder="something@connect.ust.hk"
              className="w-full"
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">
              Use your @ust.hk or @connect.ust.hk email address
            </p>
          </div>

          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
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
            <p className="text-xs text-slate-500 mt-1">
              Minimum 8 characters
            </p>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
            id="agreeToTerms"
            name="agreeToTerms"
            checked={formData.agreeToTerms}
            onCheckedChange={(checked) =>
                setFormData((prev) => ({
                ...prev,
                agreeToTerms: checked === true,
                }))
            }
            disabled={loading}
            />
            <Label htmlFor="agreeToTerms" className="text-sm text-slate-600 cursor-pointer">
              I agree to the{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-slate-600 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
