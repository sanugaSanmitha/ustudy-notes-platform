import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { adminClient } from '@/lib/supabase/admin';

const SUPABASE_BUCKET = process.env.TRANSCRIPT_STORAGE_BUCKET || 'grade-transcripts';
const R2_BUCKET = process.env.R2_BUCKET || SUPABASE_BUCKET;

function hasR2Config() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
  );
}

function getR2Client() {
  if (!hasR2Config()) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
    forcePathStyle: true,
  });
}

function isR2Bucket(bucket: string) {
  return bucket === R2_BUCKET;
}

export async function uploadTranscriptFile(buffer: Buffer, path: string, contentType: string) {
  const r2Client = getR2Client();
  if (r2Client) {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: path,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return { bucket: R2_BUCKET, path, provider: 'r2' as const };
  }

  const { error } = await adminClient.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw error;
  }

  return { bucket: SUPABASE_BUCKET, path, provider: 'supabase' as const };
}

export async function deleteTranscriptFile(bucket: string | null, path: string | null) {
  if (!bucket || !path) {
    return;
  }

  const r2Client = getR2Client();
  if (r2Client && bucket === R2_BUCKET) {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: path,
      })
    );
    return;
  }

  const { error } = await adminClient.storage.from(bucket).remove([path]);
  if (error) {
    throw error;
  }
}

export async function createTranscriptSignedUrl(
  bucket: string | null,
  path: string | null,
  expiresSeconds = 1800
) {
  if (!bucket || !path) {
    return null;
  }

  const r2Client = getR2Client();
  if (isR2Bucket(bucket)) {
    if (!r2Client) {
      throw new Error('R2 storage is not configured on the server.');
    }
    return await getSignedUrl(
      r2Client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: path,
      }),
      { expiresIn: expiresSeconds }
    );
  }

  const { data, error } = await adminClient.storage.from(bucket).createSignedUrl(path, expiresSeconds);
  if (error) {
    throw error;
  }
  return data?.signedUrl || null;
}
