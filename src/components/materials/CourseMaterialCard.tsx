'use client';

import { Clock, FileArchive, Lock, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGradeTier, getGradeTierGradient } from '@/lib/materials/grade-tiers';
import {
  getMaterialCardClasses,
  getMaterialCardState,
  getMaterialStateLabel,
} from '@/lib/materials/course-card-styles';
import { cn } from '@/lib/utils';

export type CourseMaterialInfo = {
  id: string;
  uploadedAt: string;
  zipFilename: string;
  zipSizeBytes: number;
  zipFileNames: string[];
  version: number;
  downloadCount: number;
  isLocked: boolean;
  timeRemaining: number;
};

export type CourseWithMaterial = {
  courseCode: string;
  courseName: string;
  grade: string;
  academicYear: string | null;
  semester: string | null;
  material: CourseMaterialInfo | null;
};

type CourseMaterialCardProps = {
  course: CourseWithMaterial;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
  timeRemaining: number;
  selectedFile?: File;
  zipPreview?: string[];
  zipPreviewLoading?: boolean;
  uploading?: boolean;
  downloading?: boolean;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  onDownload?: () => void;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function CourseMaterialCard({
  course,
  selected = false,
  onSelect,
  selectable = false,
  timeRemaining,
  selectedFile,
  zipPreview = [],
  zipPreviewLoading = false,
  uploading = false,
  downloading = false,
  onFileChange,
  onUpload,
  onDownload,
}: CourseMaterialCardProps) {
  const material = course.material;
  const tier = getGradeTier(course.grade);
  const timeLeft = timeRemaining || material?.timeRemaining || 0;
  const isLocked = material ? material.isLocked || timeLeft <= 0 : false;
  const cardState = getMaterialCardState(material ? { isLocked } : null);
  const stateBorderClasses = getMaterialCardClasses(cardState);
  const previewNames = zipPreview.length > 0 ? zipPreview : material?.zipFileNames || [];

  const Wrapper = selectable ? 'button' : 'div';
  const wrapperProps = selectable
    ? {
        type: 'button' as const,
        onClick: onSelect,
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'w-full overflow-hidden rounded-xl border-2 text-left transition-all duration-300',
        stateBorderClasses,
        selectable && selected && 'ring-2 ring-blue-500 ring-offset-2',
        selectable && 'hover:shadow-md'
      )}
    >
      <div className="p-5" style={{ background: getGradeTierGradient(course.grade) }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-2xl font-bold text-white">{course.courseCode}</span>
            <span className="ml-2 rounded-full bg-white/30 px-2 py-1 text-xs text-white">
              {tier.badge} {tier.label}
            </span>
          </div>
          {material ? (
            isLocked ? (
              <Lock className="size-6 text-white/90" />
            ) : (
              <Clock className="size-6 animate-pulse text-white/90" />
            )
          ) : null}
        </div>

        <h3 className="mt-2 text-lg font-semibold text-white">{course.courseName}</h3>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl font-bold text-white">{course.grade}</span>
          {material && <span className="text-sm text-white/80">· v{material.version}</span>}
        </div>

        <p
          className={cn(
            'mt-3 text-sm font-medium text-white/95',
            cardState === 'unlocked' && 'animate-pulse'
          )}
        >
          {cardState === 'unlocked' && <Clock className="mr-1 inline size-4" />}
          {cardState === 'locked' && <Lock className="mr-1 inline size-4" />}
          {getMaterialStateLabel(cardState, timeLeft)}
        </p>
      </div>

      <div className="bg-white/95 p-4">
        {material && (
          <p className="mb-3 text-xs text-slate-500">
            {material.zipFilename}
            {material.downloadCount > 0 ? ` · ${material.downloadCount} download(s)` : ''}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {!material || !isLocked ? (
            <>
              <input
                id={`file-${course.courseCode}`}
                type="file"
                accept=".zip"
                onChange={(event) => {
                  event.stopPropagation();
                  onFileChange(event.target.files?.[0] || null);
                }}
                onClick={(event) => event.stopPropagation()}
                className="hidden"
              />
              <label
                htmlFor={`file-${course.courseCode}`}
                onClick={(event) => event.stopPropagation()}
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Upload className="mr-1 inline size-3.5" />
                Choose ZIP
              </label>
              <Button
                type="button"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onUpload();
                }}
                disabled={uploading || !selectedFile}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? 'Uploading...' : material ? 'Re-upload' : 'Upload'}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onDownload?.();
              }}
              disabled={downloading}
              className="bg-red-600 hover:bg-red-700"
            >
              <FileArchive className="mr-1 size-3.5" />
              {downloading ? 'Preparing...' : 'Download'}
            </Button>
          )}
        </div>

        {selectedFile && (
          <p className="mt-3 truncate text-xs text-slate-500">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}

        {zipPreviewLoading && <p className="mt-3 text-xs text-slate-500">Reading ZIP contents...</p>}

        {previewNames.length > 0 && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-700">
              ZIP preview ({previewNames.length} file{previewNames.length === 1 ? '' : 's'})
            </p>
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-slate-600">
              {previewNames.slice(0, 12).map((name) => (
                <li key={name} className="truncate">
                  • {name}
                </li>
              ))}
              {previewNames.length > 12 && (
                <li className="text-slate-400">+ {previewNames.length - 12} more files</li>
              )}
            </ul>
          </div>
        )}

        {cardState === 'unlocked' && timeLeft > 0 && (
          <p className="mt-3 text-xs font-semibold text-sky-700">{formatTime(timeLeft)} remaining to re-upload</p>
        )}
      </div>
    </Wrapper>
  );
}
