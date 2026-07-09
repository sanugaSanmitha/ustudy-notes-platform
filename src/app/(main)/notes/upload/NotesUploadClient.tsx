'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CourseWithMaterial } from '@/components/materials/CourseMaterialCard';
import { CourseSelectRow } from '@/components/materials/CourseSelectRow';

const SEMESTERS = ['Fall', 'Winter', 'Spring', 'Summer'] as const;
const MAX_ZIP_BYTES = 100 * 1024 * 1024;

type MaterialsResponse = {
  data?: {
    verification: { id: string } | null;
    courses: CourseWithMaterial[];
    reuploadWindowLabel?: string;
    reuploadWindowShortLabel?: string;
  };
  error?: { message?: string };
};

function buildAcademicYearOptions() {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let year = current + 1; year >= current - 6; year -= 1) {
    years.push(`${year - 1}-${year}`);
  }
  return years;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function NotesUploadPage() {
  const searchParams = useSearchParams();
  const preselectedCourse = (searchParams.get('course') || '').toUpperCase();

  const [verificationId, setVerificationId] = useState('');
  const [courses, setCourses] = useState<CourseWithMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [academicYear, setAcademicYear] = useState(buildAcademicYearOptions()[0] || '2024-2025');
  const [semester, setSemester] = useState<(typeof SEMESTERS)[number]>('Fall');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipFileNames, setZipFileNames] = useState<string[]>([]);
  const [zipPreviewLoading, setZipPreviewLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [professor, setProfessor] = useState('');
  const [language, setLanguage] = useState('English');
  const [priceHkd, setPriceHkd] = useState('49');
  const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({});
  const [reuploadWindowLabel, setReuploadWindowLabel] = useState('3 minutes');
  const [reuploadWindowShortLabel, setReuploadWindowShortLabel] = useState('3 min');

  const yearOptions = useMemo(() => buildAcademicYearOptions(), []);
  const selectedCourse = courses.find((course) => course.courseCode === selectedCourseCode) || null;
  const selectedMaterial = selectedCourse?.material || null;
  const selectedTimeLeft = timeRemaining[selectedCourseCode] ?? selectedMaterial?.timeRemaining ?? 0;
  const selectedMaterialLocked = selectedMaterial
    ? selectedMaterial.isLocked || selectedTimeLeft <= 0
    : false;
  const zipPreviewNames =
    zipFileNames.length > 0 ? zipFileNames : selectedMaterialLocked ? selectedMaterial?.zipFileNames || [] : [];

  const fetchMaterials = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/grades/materials', { cache: 'no-store', credentials: 'same-origin' });
      const result = (await response.json()) as MaterialsResponse;
      if (!response.ok) {
        setError(result.error?.message || 'Failed to load courses.');
        return null;
      }

      const loaded = result.data?.courses || [];
      setCourses(loaded);
      setVerificationId(result.data?.verification?.id || '');
      if (result.data?.reuploadWindowLabel) {
        setReuploadWindowLabel(result.data.reuploadWindowLabel);
      }
      if (result.data?.reuploadWindowShortLabel) {
        setReuploadWindowShortLabel(result.data.reuploadWindowShortLabel);
      }

      const timers: Record<string, number> = {};
      loaded.forEach((course) => {
        if (course.material && !course.material.isLocked) {
          timers[course.courseCode] = course.material.timeRemaining;
        }
      });
      setTimeRemaining(timers);

      setSelectedCourseCode((current) => {
        if (preselectedCourse && loaded.some((course) => course.courseCode === preselectedCourse)) {
          return preselectedCourse;
        }
        if (current && loaded.some((course) => course.courseCode === current)) {
          return current;
        }
        return loaded[0]?.courseCode || '';
      });

      return loaded;
    } catch {
      setError('Unable to load verified courses.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [preselectedCourse]);

  useEffect(() => {
    void fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const next: Record<string, number> = {};
        let shouldRefresh = false;

        Object.entries(prev).forEach(([courseCode, remaining]) => {
          const updated = Math.max(0, remaining - 1);
          if (updated > 0) {
            next[courseCode] = updated;
          } else if (remaining > 0) {
            shouldRefresh = true;
          }
        });

        if (shouldRefresh) {
          void fetchMaterials();
        }

        return Object.keys(next).length > 0 || shouldRefresh ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchMaterials]);

  useEffect(() => {
    const course = courses.find((item) => item.courseCode === selectedCourseCode);
    if (!course) {
      return;
    }
    setTitle(`${course.courseCode} Complete Notes`);
    if (course.academicYear) setAcademicYear(course.academicYear);
    if (course.semester && SEMESTERS.includes(course.semester as (typeof SEMESTERS)[number])) {
      setSemester(course.semester as (typeof SEMESTERS)[number]);
    }
  }, [selectedCourseCode, courses]);

  useEffect(() => {
    setZipFile(null);
    setZipFileNames([]);
  }, [selectedCourseCode]);

  const handleZipChange = async (file: File | null) => {
    setZipFile(file);
    setZipFileNames([]);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please choose a .zip file.');
      setZipFile(null);
      return;
    }
    if (file.size > MAX_ZIP_BYTES) {
      setError('ZIP file must be 100MB or smaller.');
      setZipFile(null);
      return;
    }

    setZipPreviewLoading(true);
    setError('');
    try {
      const { default: JSZip } = await import('jszip');
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const names = Object.keys(zip.files)
        .filter((name) => !zip.files[name].dir)
        .map((name) => name.split('/').pop() || name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      setZipFileNames(names);
    } catch {
      setError('Could not read ZIP contents. Please choose a valid ZIP archive.');
      setZipFile(null);
    } finally {
      setZipPreviewLoading(false);
    }
  };

  const uploadMaterial = async (courseCode: string, file: File) => {
    const formData = new FormData();
    formData.append('verificationId', verificationId);
    formData.append('courseCode', courseCode);
    formData.append('file', file);

    const response = await fetch('/api/grades/materials/upload', { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to save ZIP.');
    }
    return data.data as { timeRemaining?: number; message?: string };
  };

  const handlePublish = async () => {
    setError('');
    setSuccess('');

    if (!selectedCourseCode || !verificationId) {
      setError('Select a verified course first.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setSubmitting(true);
    try {
      let material = selectedMaterial;
      let locked = selectedMaterialLocked;

      if (!locked) {
        if (!zipFile) {
          setError('Choose a ZIP file in Step 3.');
          return;
        }
        if (zipFileNames.length === 0) {
          setError('ZIP must contain at least one file.');
          return;
        }

        const uploadResult = await uploadMaterial(selectedCourseCode, zipFile);
        const loaded = await fetchMaterials();
        const updatedCourse = loaded?.find((course) => course.courseCode === selectedCourseCode);
        material = updatedCourse?.material || material;

        if (uploadResult.timeRemaining) {
          setTimeRemaining((prev) => ({ ...prev, [selectedCourseCode]: uploadResult.timeRemaining! }));
        }

        const timeLeft = uploadResult.timeRemaining ?? 0;
        locked = material ? material.isLocked || timeLeft <= 0 : false;

        if (!locked) {
          setSuccess(
            uploadResult.message ||
              `ZIP saved. Pick a different file if needed, then publish again after ${formatTime(timeLeft)} (or when locked).`
          );
          setZipFile(null);
          setZipFileNames([]);
          return;
        }
      }

      if (!material || !locked) {
        setError(`Wait for the ${reuploadWindowLabel} window to close, then click Publish again.`);
        return;
      }

      const fileNames = material.zipFileNames?.length ? material.zipFileNames : zipFileNames;
      if (fileNames.length === 0) {
        setError('ZIP has no files to publish.');
        return;
      }

      const formData = new FormData();
      formData.append(
        'metadata',
        JSON.stringify({
          courseCode: selectedCourseCode,
          materialId: material.id,
          title: title.trim(),
          description: description.trim() || undefined,
          professor: professor.trim() || undefined,
          academicYear,
          semester,
          language,
          priceHkd: Number(priceHkd),
          fileNames,
        })
      );

      const response = await fetch('/api/notes/upload', { method: 'POST', body: formData });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to publish notes.');
        return;
      }

      setSuccess(result?.data?.message || 'Notes published successfully.');
      setZipFile(null);
      setZipFileNames([]);
      await fetchMaterials();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Failed to publish.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-slate-600">Loading...</div>;
  }

  if (courses.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Upload Notes</h1>
        <Card className="mt-4 p-4">
          <p className="text-sm text-slate-700">Complete grade verification before uploading notes.</p>
          <Button asChild className="mt-3 bg-blue-600 text-white hover:bg-blue-700" size="sm">
            <Link href="/grades/upload">Verify Seller</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Upload Notes</h1>
        <p className="mt-1 text-sm text-slate-500">Select a course on the left, then complete the form on the right.</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded border border-slate-300 bg-white" />
            White — not uploaded
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded border border-sky-300 bg-sky-50" />
            Blue — uploaded ({reuploadWindowShortLabel} to amend)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded border border-red-300 bg-red-50" />
            Red — locked, no amendments
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left — scrollable course list */}
        <section className="min-w-0 flex-1 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-2">
          <h2 className="text-sm font-semibold text-slate-900">Step 1 — Select course</h2>
          <div className="mt-2 space-y-1.5">
            {courses.map((course) => (
              <CourseSelectRow
                key={course.courseCode}
                course={course}
                selected={selectedCourseCode === course.courseCode}
                timeRemaining={timeRemaining[course.courseCode] ?? 0}
                onSelect={() => setSelectedCourseCode(course.courseCode)}
              />
            ))}
          </div>
        </section>

        {/* Right — fixed form panel */}
        <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-[22rem] xl:w-[24rem]">
          <Card className="border-slate-200 p-4 shadow-sm lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            {!selectedCourse ? (
              <p className="text-sm text-slate-500">Select a course to continue.</p>
            ) : (
              <>
                <div className="mb-4 border-b border-slate-100 pb-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Selected</p>
                  <p className="font-semibold text-slate-900">{selectedCourse.courseCode}</p>
                  <p className="truncate text-sm text-slate-600">{selectedCourse.courseName}</p>
                </div>

                {selectedMaterialLocked && selectedMaterial ? (
                  <>
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3">
                      <div className="flex items-start gap-2">
                        <Lock className="mt-0.5 size-4 shrink-0 text-red-600" />
                        <div>
                          <p className="text-sm font-semibold text-red-800">Course material already uploaded</p>
                          <p className="mt-0.5 text-xs text-red-700">No further amendments allowed.</p>
                          <p className="mt-2 text-xs text-red-600">
                            {selectedMaterial.zipFilename} · v{selectedMaterial.version} ·{' '}
                            {selectedMaterial.zipFileNames.length} files
                          </p>
                        </div>
                      </div>
                    </div>

                    {zipPreviewNames.length > 0 && (
                      <ul className="mt-3 max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                        {zipPreviewNames.slice(0, 20).map((name) => (
                          <li key={name} className="truncate">
                            {name}
                          </li>
                        ))}
                        {zipPreviewNames.length > 20 && (
                          <li className="text-slate-400">+ {zipPreviewNames.length - 20} more</li>
                        )}
                      </ul>
                    )}

                    {error && (
                      <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                    )}
                    {success && (
                      <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        {success}
                      </p>
                    )}

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <Button
                        type="button"
                        className="w-full bg-blue-600 text-white hover:bg-blue-700"
                        disabled={submitting}
                        onClick={() => void handlePublish()}
                      >
                        {submitting ? 'Publishing...' : 'Publish Notes'}
                      </Button>
                      <p className="mt-2 text-xs text-slate-500">
                        Submit your listing for review. The ZIP cannot be changed.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                {error && (
                  <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                )}
                {success && (
                  <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {success}
                  </p>
                )}

                <section>
                  <h2 className="text-sm font-semibold text-slate-900">Step 2 — Semester</h2>
                  <div className="mt-2 space-y-3">
                    <div>
                      <Label htmlFor="academic-year" className="text-xs">
                        Academic Year
                      </Label>
                      <select
                        id="academic-year"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={academicYear}
                        onChange={(event) => setAcademicYear(event.target.value)}
                      >
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="semester" className="text-xs">
                        Semester
                      </Label>
                      <select
                        id="semester"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={semester}
                        onChange={(event) => setSemester(event.target.value as (typeof SEMESTERS)[number])}
                      >
                        {SEMESTERS.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="mt-5">
                  <h2 className="text-sm font-semibold text-slate-900">Step 3 — Choose ZIP</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Max 100 MB. Replace within {reuploadWindowLabel} after publishing.
                  </p>
                  <Input
                    className="mt-2"
                    type="file"
                    accept=".zip,application/zip"
                    onChange={(event) => void handleZipChange(event.target.files?.[0] || null)}
                    disabled={submitting || zipPreviewLoading}
                  />
                  {zipFile && (
                    <p className="mt-1 text-xs text-slate-500">
                      {zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  {zipPreviewLoading && <p className="mt-2 text-xs text-slate-500">Reading ZIP...</p>}
                  {zipPreviewNames.length > 0 && (
                    <ul className="mt-2 max-h-28 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                      {zipPreviewNames.slice(0, 15).map((name) => (
                        <li key={name} className="truncate">
                          {name}
                        </li>
                      ))}
                      {zipPreviewNames.length > 15 && (
                        <li className="text-slate-400">+ {zipPreviewNames.length - 15} more</li>
                      )}
                    </ul>
                  )}
                  {selectedMaterial && !selectedMaterialLocked && selectedTimeLeft > 0 && (
                    <p className="mt-2 text-xs text-sky-700">
                      Re-upload window: {formatTime(selectedTimeLeft)}
                    </p>
                  )}
                </section>

                <section className="mt-5">
                  <h2 className="text-sm font-semibold text-slate-900">Step 4 — Note details</h2>
                  <div className="mt-2 space-y-3">
                    <div>
                      <Label htmlFor="title" className="text-xs">
                        Title
                      </Label>
                      <Input id="title" className="mt-1" value={title} onChange={(event) => setTitle(event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="description" className="text-xs">
                        Description
                      </Label>
                      <Input
                        id="description"
                        className="mt-1"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Midterm + Final"
                      />
                    </div>
                    <div>
                      <Label htmlFor="professor" className="text-xs">
                        Professor (optional)
                      </Label>
                      <Input id="professor" className="mt-1" value={professor} onChange={(event) => setProfessor(event.target.value)} />
                    </div>
                    <div className="grid gap-3 grid-cols-2">
                      <div>
                        <Label htmlFor="language" className="text-xs">
                          Language
                        </Label>
                        <Input id="language" className="mt-1" value={language} onChange={(event) => setLanguage(event.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="price" className="text-xs">
                          Price (HK$)
                        </Label>
                        <Input
                          id="price"
                          className="mt-1"
                          type="number"
                          min="0"
                          value={priceHkd}
                          onChange={(event) => setPriceHkd(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <Button
                    type="button"
                    className="w-full bg-blue-600 text-white hover:bg-blue-700"
                    disabled={submitting || zipPreviewLoading}
                    onClick={() => void handlePublish()}
                  >
                    {submitting ? 'Publishing...' : 'Save ZIP & Publish'}
                  </Button>
                  <p className="mt-2 text-xs text-slate-500">
                    First publish saves ZIP. Publish again after {reuploadWindowLabel} to list.
                  </p>
                </div>
                  </>
                )}
              </>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
