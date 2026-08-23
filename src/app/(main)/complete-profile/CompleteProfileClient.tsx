'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { SCHOOL_OPTIONS, type SchoolOption } from '@/lib/profile/constants';

type ProfileResponse = {
  data?: {
    email: string;
    fullName?: string | null;
    school?: SchoolOption | null;
    profileCompleted?: boolean;
  };
  error?: { code?: string; message?: string };
};

type CompleteProfileClientProps = {
  email: string;
  fullName: string;
  school: string;
};

export function CompleteProfileClient({ email, fullName: initialFullName, school: initialSchool }: CompleteProfileClientProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [fullName, setFullName] = useState(initialFullName);
  const [school, setSchool] = useState(initialSchool);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError(t('fullNameRequired'));
      return;
    }

    if (!school) {
      setError(t('completeProfileSchoolRequired'));
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          fullName: fullName.trim(),
          school,
        }),
      });

      const result: ProfileResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (result.error?.code === 'UNAUTHORIZED') {
          router.replace('/login');
          return;
        }

        setError(result.error?.message || t('completeProfileSaveFailed'));
        return;
      }

      router.replace('/');
      router.refresh();
    } catch (err) {
      console.error('Complete profile submit error:', err);
      setError(t('completeProfileSaveUnexpected'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{t('completeProfileTitle')}</h1>
        <p className="mt-2 text-slate-600">{t('completeProfileWelcome')}</p>
        <p className="text-slate-600">{t('completeProfileSubtitle')}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 p-6">
        <div>
          <Label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            {t('email')}
          </Label>
          <Input id="email" value={email} readOnly disabled className="bg-slate-50 text-slate-600" />
        </div>

        <div>
          <Label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
            {t('authFullName')} *
          </Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('completeProfileFullNamePlaceholder')}
            disabled={submitting}
          />
        </div>

        <div>
          <Label htmlFor="school" className="mb-1 block text-sm font-medium text-slate-700">
            {t('school')} *
          </Label>
          <select
            id="school"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            disabled={submitting}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('completeProfileSelectSchool')}</option>
            {SCHOOL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitting}>
          {submitting ? t('completeProfileSaving') : t('commonContinue')}
        </Button>
      </form>
    </div>
  );
}
