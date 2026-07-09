const PRODUCTION_DEFAULT_REUPLOAD_WINDOW_HOURS = 64;
const DEVELOPMENT_DEFAULT_REUPLOAD_WINDOW_MINUTES = 3;

function readPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number.parseFloat(String(value || ''));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function resolveReuploadWindowMs() {
  if (process.env.MATERIAL_REUPLOAD_WINDOW_MINUTES) {
    return readPositiveNumber(process.env.MATERIAL_REUPLOAD_WINDOW_MINUTES, DEVELOPMENT_DEFAULT_REUPLOAD_WINDOW_MINUTES) * 60 * 1000;
  }

  if (process.env.MATERIAL_REUPLOAD_WINDOW_HOURS) {
    return readPositiveNumber(process.env.MATERIAL_REUPLOAD_WINDOW_HOURS, PRODUCTION_DEFAULT_REUPLOAD_WINDOW_HOURS) * 60 * 60 * 1000;
  }

  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_DEFAULT_REUPLOAD_WINDOW_HOURS * 60 * 60 * 1000;
  }

  return DEVELOPMENT_DEFAULT_REUPLOAD_WINDOW_MINUTES * 60 * 1000;
}

const resolvedReuploadWindowMs = resolveReuploadWindowMs();

export const materialUploadConfig = {
  reuploadWindowMs: resolvedReuploadWindowMs,
  reuploadWindowSeconds: Math.floor(resolvedReuploadWindowMs / 1000),
  reuploadWindowHours: resolvedReuploadWindowMs / (60 * 60 * 1000),
  reuploadWindowMinutes: resolvedReuploadWindowMs / (60 * 1000),
};

export function formatMaterialReuploadWindowLabel(windowMs = materialUploadConfig.reuploadWindowMs): string {
  const totalMinutes = Math.round(windowMs / (60 * 1000));

  if (totalMinutes >= 60 && totalMinutes % 60 === 0) {
    const hours = totalMinutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
}

export function formatMaterialReuploadWindowShortLabel(windowMs = materialUploadConfig.reuploadWindowMs): string {
  const totalMinutes = Math.round(windowMs / (60 * 1000));
  if (totalMinutes >= 60) {
    const hours = Math.round((totalMinutes / 60) * 10) / 10;
    return hours === Math.floor(hours) ? `${hours}h` : `${hours} hours`;
  }
  return `${totalMinutes} min`;
}
