import { materialUploadConfig } from '@/lib/materials/config';

export const REUPLOAD_WINDOW_MS = materialUploadConfig.reuploadWindowMs;

export function getReuploadTimeRemaining(uploadedAt: string | Date, isLocked: boolean): number {
  if (isLocked) {
    return 0;
  }

  const uploadTime = new Date(uploadedAt).getTime();
  const elapsed = Date.now() - uploadTime;
  return Math.max(0, Math.floor((REUPLOAD_WINDOW_MS - elapsed) / 1000));
}

export function isMaterialLocked(uploadedAt: string | Date, isLocked: boolean): boolean {
  if (isLocked) {
    return true;
  }

  const uploadTime = new Date(uploadedAt).getTime();
  return Date.now() - uploadTime > REUPLOAD_WINDOW_MS;
}
