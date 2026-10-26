import { adminClient } from '@/lib/supabase/admin';

const RECEIPT_BUCKET = process.env.ORDER_RECEIPT_STORAGE_BUCKET || 'order-receipts';
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']);

function extensionForType(type: string, filename: string) {
  const fromName = filename.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (type === 'application/pdf') return 'pdf';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/heic') return 'heic';
  return 'jpg';
}

export function assertReceiptFile(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Please upload a PDF, JPG, PNG, or WEBP receipt.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Receipt must be 8 MB or smaller.');
  }
}

export async function uploadOrderReceipt(params: {
  userId: string;
  orderId: string;
  file: File;
}) {
  assertReceiptFile(params.file);

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const ext = extensionForType(params.file.type, params.file.name);
  const path = `${params.userId}/${params.orderId}/receipt.${ext}`;

  const { error: uploadError } = await adminClient.storage.from(RECEIPT_BUCKET).upload(path, buffer, {
    upsert: true,
    contentType: params.file.type,
    cacheControl: '3600',
  });

  if (uploadError) {
    throw new Error(
      uploadError.message.includes('Bucket not found')
        ? 'Receipt storage is not configured yet. Create the "order-receipts" bucket in Supabase Storage.'
        : 'Failed to upload receipt.'
    );
  }

  const uploadedAt = new Date().toISOString();
  const { error: updateError } = await adminClient
    .from('orders')
    .update({
      receipt_storage_bucket: RECEIPT_BUCKET,
      receipt_storage_path: path,
      receipt_filename: params.file.name.slice(0, 180),
      receipt_content_type: params.file.type,
      receipt_uploaded_at: uploadedAt,
      updated_at: uploadedAt,
    })
    .eq('id', params.orderId)
    .eq('user_id', params.userId)
    .eq('payment_method', 'fps')
    .in('status', ['pending', 'payment_submitted']);

  if (updateError) {
    throw new Error('Failed to save receipt on the order.');
  }

  return {
    bucket: RECEIPT_BUCKET,
    path,
    filename: params.file.name,
    contentType: params.file.type,
    uploadedAt,
  };
}

export async function createOrderReceiptSignedUrl(
  bucket: string | null | undefined,
  path: string | null | undefined,
  expiresSeconds = 1800
) {
  if (!bucket || !path) return null;
  const { data, error } = await adminClient.storage.from(bucket).createSignedUrl(path, expiresSeconds);
  if (error) {
    console.error('Receipt signed URL error:', error);
    return null;
  }
  return data?.signedUrl || null;
}
