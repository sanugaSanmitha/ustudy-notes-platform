import { NextResponse } from 'next/server';
import { gradeVerificationConfig } from '@/lib/grades/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      data: {
        maxUploadsPerDay: gradeVerificationConfig.maxUploadsPerDay,
        maxFileSizeBytes: gradeVerificationConfig.maxFileSizeBytes,
        maxFileSizeMb: Math.round(gradeVerificationConfig.maxFileSizeBytes / (1024 * 1024)),
        maxParseRetries: gradeVerificationConfig.maxParseRetries,
        signedUrlExpiresSeconds: gradeVerificationConfig.signedUrlExpiresSeconds,
        rejectedRetentionDays: gradeVerificationConfig.rejectedRetentionDays,
        reuploadCooldownHours: gradeVerificationConfig.reuploadCooldownHours,
      },
    },
    { status: 200 }
  );
}
