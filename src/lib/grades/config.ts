const DEFAULT_MAX_UPLOADS_PER_DAY = process.env.NODE_ENV === 'production' ? 3 : 50;
const DEFAULT_MAX_FILE_SIZE_MB = process.env.NODE_ENV === 'production' ? 20 : 10;
const DEFAULT_MAX_PARSE_RETRIES = process.env.NODE_ENV === 'production' ? 2 : 10;
const DEFAULT_SIGNED_URL_EXPIRES_SECONDS = 60 * 10;
const DEFAULT_REJECT_RETENTION_DAYS = 30;
const DEFAULT_REUPLOAD_COOLDOWN_HOURS = 1;

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export const gradeVerificationConfig = {
  maxUploadsPerDay: readPositiveInt(process.env.GRADE_MAX_UPLOADS_PER_DAY, DEFAULT_MAX_UPLOADS_PER_DAY),
  maxFileSizeBytes: readPositiveInt(process.env.GRADE_MAX_FILE_SIZE_MB, DEFAULT_MAX_FILE_SIZE_MB) * 1024 * 1024,
  maxParseRetries: readPositiveInt(process.env.GRADE_MAX_PARSE_RETRIES, DEFAULT_MAX_PARSE_RETRIES),
  signedUrlExpiresSeconds: readPositiveInt(
    process.env.GRADE_SIGNED_URL_EXPIRES_SECONDS,
    DEFAULT_SIGNED_URL_EXPIRES_SECONDS
  ),
  rejectedRetentionDays: readPositiveInt(process.env.GRADE_REJECT_RETENTION_DAYS, DEFAULT_REJECT_RETENTION_DAYS),
  reuploadCooldownHours: readPositiveInt(process.env.GRADE_REUPLOAD_COOLDOWN_HOURS, DEFAULT_REUPLOAD_COOLDOWN_HOURS),
  reuploadCooldownMs:
    readPositiveInt(process.env.GRADE_REUPLOAD_COOLDOWN_HOURS, DEFAULT_REUPLOAD_COOLDOWN_HOURS) * 60 * 60 * 1000,
};

export function formatReuploadCooldownRemaining(remainingMs: number) {
  const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export function computeRejectedRetentionUntil(nowIso = new Date().toISOString()) {
  const now = new Date(nowIso);
  now.setUTCDate(now.getUTCDate() + gradeVerificationConfig.rejectedRetentionDays);
  return now.toISOString();
}
