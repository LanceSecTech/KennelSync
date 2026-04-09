import { supabase } from './_core/supabase';
import crypto from 'crypto';

/**
 * Upload a file to Supabase Storage
 * @param bucket - Storage bucket name (e.g., 'dog-photos', 'vaccination-docs', 'kennel-logos')
 * @param filePath - Path within the bucket (e.g., 'dogs/123/photo.jpg')
 * @param fileBuffer - File contents as Buffer
 * @param contentType - MIME type (e.g., 'image/jpeg')
 * @returns Object with key and public URL
 */
export async function storagePut(
  bucket: string,
  filePath: string,
  fileBuffer: Buffer | Uint8Array | string,
  contentType: string = 'application/octet-stream'
) {
  try {
    // Add random suffix to prevent enumeration
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const filePathWithSuffix = filePath.replace(/(\.[^.]+)?$/, `-${randomSuffix}$1`);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePathWithSuffix, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePathWithSuffix);

    return {
      key: filePathWithSuffix,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('[Storage] Upload failed:', error);
    throw error;
  }
}

/**
 * Get a signed URL for a private file
 * @param bucket - Storage bucket name
 * @param filePath - Path within the bucket
 * @param expiresIn - Expiration time in seconds (default 3600 = 1 hour)
 * @returns Object with key and signed URL
 */
export async function storageGet(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600
) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;

    return {
      key: filePath,
      url: data.signedUrl,
    };
  } catch (error) {
    console.error('[Storage] Get signed URL failed:', error);
    throw error;
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - Storage bucket name
 * @param filePath - Path within the bucket
 */
export async function storageDelete(bucket: string, filePath: string) {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('[Storage] Delete failed:', error);
    throw error;
  }
}
