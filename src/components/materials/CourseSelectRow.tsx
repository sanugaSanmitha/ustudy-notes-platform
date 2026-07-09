import { getGradeTier } from '@/lib/materials/grade-tiers';
import {
  getMaterialCardState,
  getMaterialStateLabel,
} from '@/lib/materials/course-card-styles';
import type { CourseWithMaterial } from '@/components/materials/CourseMaterialCard';
import { cn } from '@/lib/utils';

type CourseSelectRowProps = {
  course: CourseWithMaterial;
  selected: boolean;
  timeRemaining: number;
  onSelect: () => void;
};

export function CourseSelectRow({ course, selected, timeRemaining, onSelect }: CourseSelectRowProps) {
  const tier = getGradeTier(course.grade);
  const material = course.material;
  const timeLeft = timeRemaining || material?.timeRemaining || 0;
  const isLocked = material ? material.isLocked || timeLeft <= 0 : false;
  const cardState = getMaterialCardState(material ? { isLocked } : null);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
        selected ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:bg-slate-50',
        cardState === 'unlocked' && !selected && 'border-sky-300 bg-sky-50/40',
        cardState === 'locked' && !selected && 'border-red-200 bg-red-50/30'
      )}
    >
      <span className="h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: tier.secondaryColor }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{course.courseCode}</span>
          <span className="text-xs text-slate-500">
            {course.grade} · {tier.badge}
          </span>
          {material && (
            <span className="text-xs text-slate-400">v{material.version}</span>
          )}
        </div>
        <p className="truncate text-sm text-slate-600">{course.courseName}</p>
        <p className="text-xs text-slate-500">{getMaterialStateLabel(cardState, timeLeft)}</p>
      </div>
      {selected && <span className="shrink-0 text-xs font-medium text-blue-600">Selected</span>}
    </button>
  );
}
