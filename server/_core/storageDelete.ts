/**
 * Storage deletion utilities
 * Handles deletion of files from storage (S3/Forge proxy)
 */

import { logger } from "./logger";
import { ENV } from "./env";

/**
 * Delete file from storage
 * @param fileUrl - Full URL or storage key of the file
 * @returns true if deleted, false if failed or not found
 */
export async function deleteFileFromStorage(fileUrl: string | null | undefined): Promise<boolean> {
  if (!fileUrl || !fileUrl.trim()) {
    logger.debug("No file URL provided for deletion");
    return false;
  }

  try {
    // Check if using Forge storage proxy
    if (ENV.forgeApiUrl && ENV.forgeApiKey) {
      return await deleteFromForgeStorage(fileUrl);
    }

    // Check if using Supabase storage
    if (fileUrl.includes("supabase.co") || fileUrl.includes("supabase")) {
      return await deleteFromSupabaseStorage(fileUrl);
    }

    // Generic S3 or other storage - try DELETE request
    return await deleteFromGenericStorage(fileUrl);
  } catch (error) {
    logger.error("Storage deletion failed", error instanceof Error ? error : new Error(String(error)), {
      fileUrl: fileUrl.substring(0, 100), // Log first 100 chars only
    });
    return false;
  }
}

/**
 * Delete from Forge storage proxy
 */
async function deleteFromForgeStorage(fileUrl: string): Promise<boolean> {
  try {
    // Extract key from URL
    const urlObj = new URL(fileUrl);
    const key = urlObj.pathname.replace(/^\/v1\/storage\/download\//, "").replace(/^\/storage\//, "");

    if (!key) {
      logger.warn("Could not extract storage key from URL", { fileUrl: fileUrl.substring(0, 100) });
      return false;
    }

    const deleteUrl = new URL("v1/storage/delete", ENV.forgeApiUrl.replace(/\/+$/, ""));
    deleteUrl.searchParams.set("path", key);

    const response = await fetch(deleteUrl.toString(), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${ENV.forgeApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      logger.warn("Forge storage deletion failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }

    logger.info("File deleted from Forge storage", { key });
    return true;
  } catch (error) {
    logger.error("Forge storage deletion error", error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Delete from Supabase storage
 */
async function deleteFromSupabaseStorage(fileUrl: string): Promise<boolean> {
  try {
    // Supabase storage deletion requires bucket name and file path
    // This is a simplified implementation - may need adjustment based on actual Supabase setup
    logger.info("Supabase storage deletion requested", { fileUrl: fileUrl.substring(0, 100) });
    
    // TODO: Implement Supabase storage deletion if using Supabase Storage
    // For now, return false to indicate not implemented
    logger.warn("Supabase storage deletion not fully implemented");
    return false;
  } catch (error) {
    logger.error("Supabase storage deletion error", error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Delete from generic storage (S3, etc.) via DELETE request
 */
async function deleteFromGenericStorage(fileUrl: string): Promise<boolean> {
  try {
    const response = await fetch(fileUrl, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      logger.warn("Generic storage deletion failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }

    logger.info("File deleted from generic storage", { fileUrl: fileUrl.substring(0, 100) });
    return true;
  } catch (error) {
    logger.error("Generic storage deletion error", error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

