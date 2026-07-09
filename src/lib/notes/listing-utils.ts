const GRADE_ORDER = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F', 'P', 'PP', 'AU'];

export type ListingSortOption = 'newest' | 'grade' | 'price_asc' | 'price_desc';

export function compareGrades(a: string, b: string): number {
  const indexA = GRADE_ORDER.indexOf(a);
  const indexB = GRADE_ORDER.indexOf(b);
  const rankA = indexA === -1 ? GRADE_ORDER.length : indexA;
  const rankB = indexB === -1 ? GRADE_ORDER.length : indexB;
  return rankA - rankB;
}

export function getGradeRange(grades: string[]): { from: string; to: string } | null {
  const known = grades.filter((grade) => GRADE_ORDER.includes(grade));
  if (known.length === 0) {
    return null;
  }

  const sorted = [...known].sort(compareGrades);
  return { from: sorted[0], to: sorted[sorted.length - 1] };
}

export function formatGradeRange(grades: string[]): string | null {
  const range = getGradeRange(grades);
  if (!range) {
    return null;
  }
  if (range.from === range.to) {
    return range.from;
  }
  return `${range.from} → ${range.to}`;
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }

  return date.toLocaleDateString('en-HK', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function sortListings<T extends { grade: string; price_hkd: number; created_at: string }>(
  listings: T[],
  sort: ListingSortOption
): T[] {
  const sorted = [...listings];

  switch (sort) {
    case 'grade':
      return sorted.sort((a, b) => {
        const gradeDiff = compareGrades(a.grade, b.grade);
        if (gradeDiff !== 0) {
          return gradeDiff;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    case 'price_asc':
      return sorted.sort((a, b) => Number(a.price_hkd) - Number(b.price_hkd));
    case 'price_desc':
      return sorted.sort((a, b) => Number(b.price_hkd) - Number(a.price_hkd));
    case 'newest':
    default:
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}
