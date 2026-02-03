/**
 * Utilities for detecting and managing external/removable drives on macOS
 * Used to handle HDDs that may disconnect and need to be reconnected
 */

import { exec, stats, log } from "./neu";

/**
 * Detects if a path is on an external/removable drive on macOS
 * Primarily targets mounted volumes in /Volumes/
 *
 * @param path Absolute filesystem path to check
 * @returns true if the path is on an external drive, false otherwise
 */
export async function isExternalDrive(path: string): Promise<boolean> {
  // Quick check: paths not in /Volumes are typically internal
  if (!path.startsWith("/Volumes/")) {
    return false;
  }

  // Macintosh HD is the internal drive - don't treat as external
  if (path.includes("/Volumes/Macintosh HD")) {
    return false;
  }

  try {
    // Extract just the volume name from the path
    // E.g., "/Volumes/HDD Lucas/Genshin Impact" → "/Volumes/HDD Lucas"
    const parts = path.split("/");
    const volumePath = parts.length >= 3 ? `/${parts[1]}/${parts[2]}` : path;

    const { stdOut } = await exec(["diskutil", "info", volumePath]);

    // Look for indicators of external/removable drive
    const isRemovable = stdOut.includes("Removable Media:          Yes");
    const isExternal = stdOut.includes("External:                 Yes");

    await log(
      `External drive detection: path=${path}, volumePath=${volumePath}, removable=${isRemovable}, external=${isExternal}`
    );

    return isRemovable || isExternal;
  } catch (error) {
    await log(`Failed to detect drive type for ${path}: ${error}`);
    // If diskutil fails, assume it's external if it's in /Volumes
    // Better to be cautious and treat as external
    return true;
  }
}

/**
 * Checks if a drive path is currently accessible/mounted
 * Uses filesystem stats to verify the path exists and is readable
 *
 * @param path Path to check
 * @returns true if accessible, false otherwise
 */
export async function isDriveAccessible(path: string): Promise<boolean> {
  try {
    await stats(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts the volume name from a /Volumes path
 * E.g., "/Volumes/GameDrive/folder" → "GameDrive"
 *
 * @param path Absolute path to extract volume from
 * @returns Volume name or "Unknown" if cannot parse
 */
export function getVolumeName(path: string): string {
  if (!path.startsWith("/Volumes/")) {
    return "Unknown";
  }
  const parts = path.split("/");
  return parts[2] || "Unknown";
}

/**
 * Utility to detect if an error is a filesystem "file not found" type error
 * Checks for common error codes and messages:
 * - ENOENT: File does not exist
 * - ENOTDIR: Not a directory
 * - "not found", "no such file"
 *
 * @param error The error object to check
 * @returns true if this appears to be a file not found error
 */
export function isFileNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorMsg = error.message.toLowerCase();
  return (
    errorMsg.includes("enoent") ||
    errorMsg.includes("enotdir") ||
    errorMsg.includes("no such file") ||
    errorMsg.includes("not found")
  );
}

/**
 * Checks if an error is related to permission/access issues
 * @param error The error to check
 * @returns true if this appears to be a permission error
 */
export function isPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorMsg = error.message.toLowerCase();
  return (
    errorMsg.includes("eacces") ||
    errorMsg.includes("eperm") ||
    errorMsg.includes("permission denied")
  );
}
