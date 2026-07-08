'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type CatalogCourse = {
  courseCode: string;
  courseTitle: string;
  level: 'UG' | 'PG';
};

type CourseCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onCourseSelect?: (course: CatalogCourse) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function CourseCodeInput({
  value,
  onChange,
  onCourseSelect,
  disabled,
  placeholder = 'COMP1021',
  className,
}: CourseCodeInputProps) {
  const [suggestions, setSuggestions] = useState<CatalogCourse[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/courses?q=${encodeURIComponent(trimmed)}&pageSize=8`, {
          cache: 'no-store',
        });
        const result = await response.json().catch(() => null);
        if (response.ok) {
          setSuggestions(result?.data?.courses || []);
          setOpen(true);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [value]);

  const handleSelect = (course: CatalogCourse) => {
    onChange(course.courseCode);
    onCourseSelect?.(course);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        autoComplete="off"
      />
      {open && (suggestions.length > 0 || loading) && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {loading && suggestions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">Searching catalog…</p>
          ) : (
            suggestions.map((course) => (
              <button
                key={`${course.courseCode}-${course.courseTitle}`}
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(course)}
              >
                <span className="text-sm font-medium text-slate-900">{course.courseCode}</span>
                <span className="text-xs text-slate-500">
                  {course.courseTitle} · {course.level}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
