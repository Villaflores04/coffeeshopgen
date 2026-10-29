import { supabase } from './supabase.js';

const BUCKET = 'shop-images';
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Uploads an image into the user's own folder and returns its public URL. */
export async function uploadImage(file, userId) {
  const ext = TYPES[file.type];
  if (!ext) throw new Error('Use a JPG, PNG or WebP image.');
  if (file.size > MAX_BYTES) throw new Error('Images must be 5 MB or smaller.');

  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '31536000', contentType: file.type });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
