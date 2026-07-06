'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EditableCourseRow = {
  id: string;
  source: 'ai' | 'user_added';
  rowState: 'green' | 'purple' | 'orange';
  edited: boolean;
  confidence: number | null;
  courseCode: string;
  courseName: string;
  grade: string;
};

type GradeTableEditorProps = {
  rows: EditableCourseRow[];
  readOnly?: boolean;
  onChange: (rows: EditableCourseRow[]) => void;
  onSave: (rows: EditableCourseRow[]) => Promise<void>;
};

function rowBorderClass(rowState: EditableCourseRow['rowState']) {
  if (rowState === 'purple') return 'border-l-4 border-l-violet-400';
  if (rowState === 'orange') return 'border-l-4 border-l-orange-400';
  return 'border-l-2 border-l-emerald-400';
}

function rowStateLabel(row: EditableCourseRow) {
  if (row.rowState === 'orange') return 'User added';
  if (row.rowState === 'purple') return row.edited ? 'Edited' : 'Edited';
  return 'AI extracted';
}

export function GradeTableEditor({ rows, readOnly, onChange, onSave }: GradeTableEditorProps) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const updateRow = useCallback(
    (id: string, field: keyof Pick<EditableCourseRow, 'courseCode' | 'courseName' | 'grade'>, value: string) => {
      onChange(
        rows.map((row) => {
          if (row.id !== id) return row;
          const updated = { ...row, [field]: value };
          if (row.source === 'user_added') {
            return { ...updated, rowState: 'orange' as const, edited: true };
          }
          return { ...updated, rowState: 'purple' as const, edited: true };
        })
      );
    },
    [rows, onChange]
  );

  const addRow = () => {
    onChange([
      ...rows,
      {
        id: `new-${crypto.randomUUID()}`,
        source: 'user_added',
        rowState: 'orange',
        edited: true,
        confidence: null,
        courseCode: '',
        courseName: '',
        grade: '',
      },
    ]);
  };

  const scheduleDelete = (id: string) => {
    setPendingDelete(id);
    setTimeout(() => setPendingDelete((current) => (current === id ? null : current)), 5000);
  };

  const confirmDelete = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
    setPendingDelete(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await onSave(rows);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const hasEmptyRequired = rows.some((row) => !row.courseCode.trim() || !row.grade.trim());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Extracted Courses ({rows.length})</h3>
        {!readOnly && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1 h-4 w-4" />
              Add row
            </Button>
            <Button type="button" size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSave} disabled={saving || hasEmptyRequired}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        )}
      </div>

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      {hasEmptyRequired && !readOnly && (
        <p className="text-xs text-amber-700">Fill in course code and grade for every row before approving.</p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">No courses extracted.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isPendingDelete = pendingDelete === row.id;
            return (
              <div
                key={row.id}
                className={cn(
                  'rounded-md border border-slate-200 bg-white p-3',
                  rowBorderClass(row.rowState),
                  isPendingDelete && 'opacity-50 line-through'
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{rowStateLabel(row)}</span>
                  {!readOnly && !isPendingDelete && (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-600"
                      onClick={() => scheduleDelete(row.id)}
                      aria-label="Delete row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {isPendingDelete && (
                    <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setPendingDelete(null)}>
                      Undo
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Course code</label>
                    <Input
                      value={row.courseCode}
                      disabled={readOnly || isPendingDelete}
                      onChange={(e) => updateRow(row.id, 'courseCode', e.target.value.toUpperCase())}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Course name</label>
                    <Input
                      value={row.courseName}
                      disabled={readOnly || isPendingDelete}
                      onChange={(e) => updateRow(row.id, 'courseName', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Grade</label>
                    <Input
                      value={row.grade}
                      disabled={readOnly || isPendingDelete}
                      onChange={(e) => updateRow(row.id, 'grade', e.target.value.toUpperCase())}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                {row.confidence != null && (
                  <p className="mt-1 text-xs text-slate-400">Confidence: {Math.round(row.confidence * 100)}%</p>
                )}
              </div>
            );
          })}
          {pendingDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-red-600"
              onClick={() => confirmDelete(pendingDelete)}
            >
              Confirm delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
