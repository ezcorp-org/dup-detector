/**
 * Formatting utilities for display.
 */

/**
 * Formats bytes into a human-readable string.
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${size} ${sizes[i]}`;
}

/**
 * Truncates a hash to a shorter display format.
 * @param hash - Full MD5 hash
 * @param length - Number of characters to show
 */
export function truncateHash(hash: string, length: number = 8): string {
  if (hash.length <= length) return hash;
  return hash.substring(0, length) + '...';
}

/**
 * Extracts the filename from a full path.
 * @param path - Full file path
 */
export function getFileName(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] || '';
}

/**
 * Gets the parent directory from a full path.
 * @param path - Full file path
 */
export function getDirectory(path: string): string {
  const parts = path.split(/[/\\]/);
  parts.pop();
  return parts.join('/') || '/';
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 * @param ms - Duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Formats a number with thousand separators.
 * @param num - Number to format
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Pluralizes a word based on count.
 * @param count - Number of items
 * @param singular - Singular form
 * @param plural - Plural form (optional, defaults to singular + 's')
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  const word = count === 1 ? singular : (plural || singular + 's');
  return `${formatNumber(count)} ${word}`;
}
