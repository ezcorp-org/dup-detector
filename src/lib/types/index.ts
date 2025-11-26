/**
 * TypeScript types matching the Rust backend types.
 * All types use camelCase to match Rust's serde serialization.
 */

/** Options for configuring a duplicate scan operation. */
export interface ScanOptions {
  /** Root directories to scan for duplicates. */
  rootPaths: string[];

  /** Minimum file size in bytes to consider. */
  minFileSize?: number;

  /** Only include files with these extensions. */
  includeExtensions?: string[];

  /** Exclude files with these extensions. */
  excludeExtensions?: string[];

  /** Whether to follow symbolic links. */
  followSymlinks: boolean;
}

/** Represents a single file entry with its metadata. */
export interface FileEntry {
  /** Absolute path to the file. */
  path: string;

  /** File size in bytes. */
  size: number;

  /** Last modification time as ISO 8601 string. */
  modified?: string;
}

/** A group of duplicate files sharing the same content hash. */
export interface DuplicateGroup {
  /** MD5 hash of the file content. */
  hash: string;

  /** Size of each file in bytes. */
  size: number;

  /** List of files with this hash. */
  files: FileEntry[];
}

/** Phases of the duplicate scanning process. */
export type ScanPhase =
  | 'counting'
  | 'grouping'
  | 'hashing'
  | 'finalizing'
  | 'complete'
  | 'cancelled';

/** Progress information for an ongoing scan. */
export interface ScanProgress {
  /** Number of files scanned so far. */
  filesScanned: number;

  /** Total number of files to scan (if known). */
  filesTotal?: number;

  /** Current phase of the scan operation. */
  currentPhase: ScanPhase;

  /** Optional message with additional details. */
  message?: string;
}

/** Result of a completed duplicate scan. */
export interface ScanResult {
  /** Groups of duplicate files found. */
  duplicateGroups: DuplicateGroup[];

  /** Total number of files scanned. */
  totalFilesScanned: number;

  /** Total number of duplicate files found. */
  totalDuplicatesFound: number;

  /** Total wasted space in bytes. */
  totalWastedSpace: number;

  /** Non-fatal errors encountered during scanning. */
  errors: ScanError[];

  /** Duration of the scan in milliseconds. */
  durationMs: number;
}

/** A non-fatal error that occurred during scanning. */
export interface ScanError {
  /** Path that caused the error. */
  path: string;

  /** Human-readable error message. */
  message: string;
}

/** Result of a file deletion operation. */
export interface DeleteResult {
  /** Paths of successfully deleted files. */
  deleted: string[];

  /** Files that failed to delete. */
  failed: DeleteError[];
}

/** Error information for a failed file deletion. */
export interface DeleteError {
  /** Path of the file that couldn't be deleted. */
  path: string;

  /** Reason for the failure. */
  reason: string;
}

/** Application scan status. */
export type ScanStatus = 'idle' | 'scanning' | 'finished' | 'cancelled' | 'error';

/** Error response from the backend. */
export interface ErrorResponse {
  /** Error code for programmatic handling. */
  code: string;

  /** Human-readable error message. */
  message: string;

  /** Optional path related to the error. */
  path?: string;
}
