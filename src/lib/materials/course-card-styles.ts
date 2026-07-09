export type MaterialCardState = 'pending' | 'unlocked' | 'locked';

export function getMaterialCardState(material: { isLocked: boolean } | null | undefined): MaterialCardState {
  if (!material) {
    return 'pending';
  }
  return material.isLocked ? 'locked' : 'unlocked';
}

export function getMaterialCardClasses(state: MaterialCardState): string {
  switch (state) {
    case 'unlocked':
      return 'border-sky-300 bg-sky-50';
    case 'locked':
      return 'border-red-300 bg-red-50';
    default:
      return 'border-slate-200 bg-white';
  }
}

export function getMaterialStateLabel(state: MaterialCardState, timeLeftSeconds?: number): string {
  switch (state) {
    case 'unlocked':
      return timeLeftSeconds && timeLeftSeconds > 0
        ? `Uploaded — ${formatCountdown(timeLeftSeconds)} to re-upload`
        : 'Uploaded — re-upload window open';
    case 'locked':
      return 'Locked — download only';
    default:
      return 'No material uploaded yet';
  }
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
