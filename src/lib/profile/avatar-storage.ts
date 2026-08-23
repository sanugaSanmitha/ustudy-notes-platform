import { adminClient } from '@/lib/supabase/admin';

const AVATAR_BUCKET = process.env.AVATAR_STORAGE_BUCKET || 'avatars';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024;

function extensionForType(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpg';
}

export async function uploadUserAvatar(userId: string, file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Please upload a JPG, PNG, WEBP, or GIF image.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${userId}/avatar.${extensionForType(file.type)}`;

  const { error: uploadError } = await adminClient.storage.from(AVATAR_BUCKET).upload(path, buffer, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  });

  if (uploadError) {
    throw new Error(
      uploadError.message.includes('Bucket not found')
        ? 'Avatar storage is not configured yet. Create the "avatars" bucket in Supabase Storage.'
        : 'Failed to upload profile photo.'
    );
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await adminClient
    .from('users')
    .update({ avatar_url: cacheBustedUrl })
    .eq('id', userId);

  if (updateError) {
    throw new Error('Failed to save profile photo.');
  }

  return cacheBustedUrl;
}
