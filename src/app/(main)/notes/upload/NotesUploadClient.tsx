'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type VerifiedCourse = {
  id: string;
  course_code: string;
  course_name: string | null;
  grade: string;
  academic_year: string | null;
  semester: string | null;
};

const SEMESTERS = ['Fall', 'Winter', 'Spring', 'Summer'] as const;
const MAX_ZIP_BYTES = 500 * 1024 * 1024;

function buildAcademicYearOptions() {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let year = current + 1; year >= current - 6; year -= 1) {
    years.push(`${year - 1}-${year}`);
  }
  return years;
}

export default function NotesUploadPage() {
  const searchParams = useSearchParams();
  const preselectedCourse = (searchParams.get('course') || '').toUpperCase();

  const [courses, setCourses] = useState<VerifiedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [zipPreviewLoading, setZipPreviewLoading] = useState(false);

  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [academicYear, setAcademicYear] = useState(buildAcademicYearOptions()[0] || '2024-2025');
  const [semester, setSemester] = useState<(typeof SEMESTERS)[number]>('Fall');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipFileNames, setZipFileNames] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [professor, setProfessor] = useState('');
  const [language, setLanguage] = useState('English');
  const [priceHkd, setPriceHkd] = useState('49');

  const yearOptions = useMemo(() => buildAcademicYearOptions(), []);
  const selectedCourse = courses.find((course) => course.course_code === selectedCourseCode) || null;

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/verified-courses', { cache: 'no-store', credentials: 'same-origin' });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setError(result?.error?.message || 'Failed to load verified courses.');
          return;
        }
        const loaded = result?.data?.courses || [];
        setCourses(loaded);
        if (preselectedCourse && loaded.some((c: VerifiedCourse) => c.course_code === preselectedCourse)) {
          setSelectedCourseCode(preselectedCourse);
        } else if (loaded.length > 0) {
          setSelectedCourseCode(loaded[0].course_code);
        }
      } catch {
        setError('Unable to load verified courses.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [preselectedCourse]);

  useEffect(() => {
    if (selectedCourse && !title) {
      setTitle(`${selectedCourse.course_code} Complete Notes`);
      if (selectedCourse.academic_year) setAcademicYear(selectedCourse.academic_year);
      if (selectedCourse.semester && SEMESTERS.includes(selectedCourse.semester as (typeof SEMESTERS)[number])) {
        setSemester(selectedCourse.semester as (typeof SEMESTERS)[number]);
      }
    }
  }, [selectedCourse, title]);

  const handleZipChange = async (file: File | null) => {
    setZipFile(file);
    setZipFileNames([]);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please choose a .zip file.');
      return;
    }
    if (file.size > MAX_ZIP_BYTES) {
      setError('ZIP file must be 500MB or smaller.');
      return;
    }

    setZipPreviewLoading(true);
    setError('');
    try {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const names = Object.keys(zip.files)
        .filter((name) => !zip.files[name].dir)
        .map((name) => name.split('/').pop() || name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      setZipFileNames(names);
    } catch {
      setError('Could not read ZIP contents. Please upload a valid ZIP archive.');
      setZipFile(null);
    } finally {
      setZipPreviewLoading(false);
    }
  };

  const handlePublish = async () => {
    setError('');
    setSuccess('');

    if (!selectedCourseCode) {
      setError('Select a verified course first.');
      return;
    }
    if (!zipFile || zipFileNames.length === 0) {
      setError('Upload a ZIP file with at least one note file.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('zip', zipFile);
      formData.append(
        'metadata',
        JSON.stringify({
          courseCode: selectedCourseCode,
          title: title.trim(),
          description: description.trim() || undefined,
          professor: professor.trim() || undefined,
          academicYear,
          semester,
          language,
          priceHkd: Number(priceHkd),
          fileNames: zipFileNames,
        })
      );

      const response = await fetch('/api/notes/upload', { method: 'POST', body: formData });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to publish notes.');
        return;
      }
      setSuccess(result?.data?.message || 'Notes submitted successfully.');
    } catch {
      setError('Unable to publish notes right now.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-slate-600">Loading verified courses...</div>;
  }

  if (courses.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900">Upload Notes</h1>
        <Card className="mt-6 p-6">
          <p className="text-sm text-slate-700">You need approved grade verification before uploading notes.</p>
          <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
            <Link href="/grades/upload">Verify Seller</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Upload Notes</h1>
      <p className="mt-2 text-slate-600">Publish notes only for courses verified on your transcript.</p>

      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Step 1 — Select Verified Course</h2>
        <div className="mt-4 space-y-3">
          {courses.map((course) => {
            const selected = selectedCourseCode === course.course_code;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => {
                  setSelectedCourseCode(course.course_code);
                  setTitle(`${course.course_code} Complete Notes`);
                }}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <p className="font-semibold text-slate-900">✓ {course.course_code}</p>
                <p className="text-sm text-slate-600">{course.course_name || 'Course title unavailable'}</p>
                <p className="text-sm text-slate-600">
                  Grade: {course.grade}
                  {course.semester ? ` · ${course.semester}` : ''}
                  {course.academic_year ? ` ${course.academic_year}` : ''}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Step 2 — Choose Semester</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="academic-year">Academic Year</Label>
            <select
              id="academic-year"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="semester">Semester</Label>
            <select
              id="semester"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={semester}
              onChange={(e) => setSemester(e.target.value as (typeof SEMESTERS)[number])}
            >
              {SEMESTERS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Step 3 — Upload ZIP</h2>
        <Input
          className="mt-4"
          type="file"
          accept=".zip,application/zip"
          onChange={(e) => void handleZipChange(e.target.files?.[0] || null)}
          disabled={submitting || zipPreviewLoading}
        />
        <p className="mt-2 text-xs text-slate-500">Maximum size: 500 MB</p>
      </Card>

      {zipFileNames.length > 0 && (
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Step 4 — Preview</h2>
          <p className="mt-2 text-sm text-slate-600">Total files: {zipFileNames.length}</p>
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm text-slate-700">
            {zipFileNames.map((name) => (
              <li key={name}>• {name}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Step 5 — Note Information</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Midterm + Final" />
          </div>
          <div>
            <Label htmlFor="professor">Professor (optional)</Label>
            <Input id="professor" value={professor} onChange={(e) => setProfessor(e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="language">Language</Label>
              <Input id="language" value={language} onChange={(e) => setLanguage(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="price">Price (HK$)</Label>
              <Input id="price" type="number" min="0" value={priceHkd} onChange={(e) => setPriceHkd(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <Button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={submitting || zipPreviewLoading}
          onClick={() => void handlePublish()}
        >
          {submitting ? 'Publishing...' : 'Publish Notes'}
        </Button>
      </div>
    </div>
  );
}
