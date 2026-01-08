import { supabase } from './supabase';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Storage bucket names
export const BUCKETS = {
  USER_FILES: 'user-files',
  PUBLIC_FILES: 'public-files',
  AVATARS: 'avatars',
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucketName: BucketName,
  filePath: string,
  fileName: string,
  contentType?: string
): Promise<{ url: string; path: string } | null> {
  try {
    let fileData: Blob | ArrayBuffer;
    
    if (Platform.OS === 'web') {
      // Web: fetch the file as blob
      const response = await fetch(filePath);
      fileData = await response.blob();
    } else {
      // Native: read file as base64 and convert to ArrayBuffer
      const base64 = await FileSystem.readAsStringAsync(filePath, {
        encoding: 'base64',
      });
      
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes.buffer;
    }

    // Generate unique file path
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${fileName}`;
    const storagePath = `uploads/${uniqueFileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileData, {
        contentType: contentType || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      console.error('[Storage] Upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('[Storage] Upload failed:', error);
    return null;
  }
}

/**
 * Upload user avatar
 */
export async function uploadAvatar(
  userId: string,
  filePath: string,
  fileName: string
): Promise<string | null> {
  try {
    let fileData: Blob | ArrayBuffer;
    
    if (Platform.OS === 'web') {
      const response = await fetch(filePath);
      fileData = await response.blob();
    } else {
      const base64 = await FileSystem.readAsStringAsync(filePath, {
        encoding: 'base64',
      });
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes.buffer;
    }

    const extension = fileName.split('.').pop() || 'jpg';
    const storagePath = `${userId}/avatar.${extension}`;

    const { data, error } = await supabase.storage
      .from(BUCKETS.AVATARS)
      .upload(storagePath, fileData, {
        contentType: `image/${extension}`,
        upsert: true, // Replace existing avatar
      });

    if (error) {
      console.error('[Storage] Avatar upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKETS.AVATARS)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('[Storage] Avatar upload failed:', error);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  bucketName: BucketName,
  filePath: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('[Storage] Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Storage] Delete failed:', error);
    return false;
  }
}

/**
 * List files in a bucket/folder
 */
export async function listFiles(
  bucketName: BucketName,
  folderPath?: string
): Promise<Array<{ name: string; url: string; size: number; createdAt: string }>> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath || '', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('[Storage] List error:', error);
      return [];
    }

    return data.map((file) => {
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(`${folderPath ? folderPath + '/' : ''}${file.name}`);

      return {
        name: file.name,
        url: urlData.publicUrl,
        size: file.metadata?.size || 0,
        createdAt: file.created_at,
      };
    });
  } catch (error) {
    console.error('[Storage] List failed:', error);
    return [];
  }
}

/**
 * Get signed URL for private files (temporary access)
 */
export async function getSignedUrl(
  bucketName: BucketName,
  filePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('[Storage] Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('[Storage] Signed URL failed:', error);
    return null;
  }
}

/**
 * Download a file
 */
export async function downloadFile(
  bucketName: BucketName,
  filePath: string
): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (error) {
      console.error('[Storage] Download error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Storage] Download failed:', error);
    return null;
  }
}
