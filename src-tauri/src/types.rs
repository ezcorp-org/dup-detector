//! Core data types for the Duplicate File Detector.
//!
//! These types are shared between the Rust backend and the Svelte frontend,
//! serialized as JSON with camelCase naming for JavaScript compatibility.

use serde::{Deserialize, Serialize};

/// Options for configuring a duplicate scan operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanOptions {
    /// Root directories to scan for duplicates.
    pub root_paths: Vec<String>,

    /// Minimum file size in bytes to consider (files smaller than this are skipped).
    #[serde(default)]
    pub min_file_size: Option<u64>,

    /// Only include files with these extensions (case-insensitive).
    /// If None, all extensions are included.
    #[serde(default)]
    pub include_extensions: Option<Vec<String>>,

    /// Exclude files with these extensions (case-insensitive).
    /// Takes precedence over include_extensions.
    #[serde(default)]
    pub exclude_extensions: Option<Vec<String>>,

    /// Whether to follow symbolic links during scanning.
    /// Default is false to avoid infinite loops.
    #[serde(default)]
    pub follow_symlinks: bool,
}

impl Default for ScanOptions {
    fn default() -> Self {
        Self {
            root_paths: Vec::new(),
            min_file_size: None,
            include_extensions: None,
            exclude_extensions: None,
            follow_symlinks: false,
        }
    }
}

/// Represents a single file entry with its metadata.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    /// Absolute path to the file.
    pub path: String,

    /// File size in bytes.
    pub size: u64,

    /// Last modification time as ISO 8601 string, if available.
    #[serde(default)]
    pub modified: Option<String>,
}

impl FileEntry {
    /// Creates a new FileEntry with the given path, size, and modification time.
    pub fn new(path: String, size: u64, modified: Option<String>) -> Self {
        Self { path, size, modified }
    }
}

/// A group of duplicate files sharing the same content hash.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateGroup {
    /// MD5 hash of the file content (lowercase hex string).
    pub hash: String,

    /// Size of each file in bytes.
    pub size: u64,

    /// List of files with this hash (at least 2 entries).
    pub files: Vec<FileEntry>,
}

impl DuplicateGroup {
    /// Creates a new DuplicateGroup.
    pub fn new(hash: String, size: u64, files: Vec<FileEntry>) -> Self {
        Self { hash, size, files }
    }

    /// Returns the number of duplicate files in this group.
    pub fn count(&self) -> usize {
        self.files.len()
    }

    /// Calculates the wasted space: (count - 1) * size.
    /// This is the space that could be recovered by keeping only one copy.
    pub fn wasted_space(&self) -> u64 {
        if self.files.len() <= 1 {
            return 0;
        }
        ((self.files.len() - 1) as u64) * self.size
    }
}

/// Progress information for an ongoing scan.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    /// Number of files scanned so far.
    pub files_scanned: u64,

    /// Total number of files to scan (if known).
    #[serde(default)]
    pub files_total: Option<u64>,

    /// Current phase of the scan operation.
    pub current_phase: ScanPhase,

    /// Optional message with additional details.
    #[serde(default)]
    pub message: Option<String>,
}

impl ScanProgress {
    /// Creates a new ScanProgress.
    pub fn new(files_scanned: u64, files_total: Option<u64>, current_phase: ScanPhase) -> Self {
        Self {
            files_scanned,
            files_total,
            current_phase,
            message: None,
        }
    }

    /// Sets an optional message.
    pub fn with_message(mut self, message: impl Into<String>) -> Self {
        self.message = Some(message.into());
        self
    }
}

/// Phases of the duplicate scanning process.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ScanPhase {
    /// Initial directory traversal, counting files.
    Counting,

    /// Grouping files by size.
    Grouping,

    /// Computing MD5 hashes for candidate files.
    Hashing,

    /// Final grouping by hash.
    Finalizing,

    /// Scan completed successfully.
    Complete,

    /// Scan was cancelled by user.
    Cancelled,
}

/// Result of a completed duplicate scan.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    /// Groups of duplicate files found.
    pub duplicate_groups: Vec<DuplicateGroup>,

    /// Total number of files scanned.
    pub total_files_scanned: u64,

    /// Total number of duplicate files found (sum of all group counts).
    pub total_duplicates_found: u64,

    /// Total wasted space in bytes (space recoverable by removing duplicates).
    pub total_wasted_space: u64,

    /// Non-fatal errors encountered during scanning.
    pub errors: Vec<ScanError>,

    /// Duration of the scan in milliseconds.
    pub duration_ms: u64,
}

impl ScanResult {
    /// Creates a new ScanResult.
    pub fn new(
        duplicate_groups: Vec<DuplicateGroup>,
        total_files_scanned: u64,
        errors: Vec<ScanError>,
        duration_ms: u64,
    ) -> Self {
        let total_duplicates_found: u64 = duplicate_groups
            .iter()
            .map(|g| g.files.len() as u64)
            .sum();

        let total_wasted_space: u64 = duplicate_groups
            .iter()
            .map(|g| g.wasted_space())
            .sum();

        Self {
            duplicate_groups,
            total_files_scanned,
            total_duplicates_found,
            total_wasted_space,
            errors,
            duration_ms,
        }
    }
}

/// A non-fatal error that occurred during scanning.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanError {
    /// Path that caused the error.
    pub path: String,

    /// Human-readable error message.
    pub message: String,
}

impl ScanError {
    /// Creates a new ScanError.
    pub fn new(path: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            path: path.into(),
            message: message.into(),
        }
    }
}

/// Result of a file deletion operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResult {
    /// Paths of successfully deleted files.
    pub deleted: Vec<String>,

    /// Files that failed to delete.
    pub failed: Vec<DeleteError>,
}

impl DeleteResult {
    /// Creates a new DeleteResult.
    pub fn new(deleted: Vec<String>, failed: Vec<DeleteError>) -> Self {
        Self { deleted, failed }
    }

    /// Returns true if all files were deleted successfully.
    pub fn all_succeeded(&self) -> bool {
        self.failed.is_empty()
    }
}

/// Error information for a failed file deletion.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteError {
    /// Path of the file that couldn't be deleted.
    pub path: String,

    /// Reason for the failure.
    pub reason: String,
}

impl DeleteError {
    /// Creates a new DeleteError.
    pub fn new(path: impl Into<String>, reason: impl Into<String>) -> Self {
        Self {
            path: path.into(),
            reason: reason.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_options_default() {
        let opts = ScanOptions::default();
        assert!(opts.root_paths.is_empty());
        assert!(opts.min_file_size.is_none());
        assert!(opts.include_extensions.is_none());
        assert!(opts.exclude_extensions.is_none());
        assert!(!opts.follow_symlinks);
    }

    #[test]
    fn test_scan_options_serialization() {
        let opts = ScanOptions {
            root_paths: vec!["/home/user".to_string()],
            min_file_size: Some(1024),
            include_extensions: Some(vec!["jpg".to_string(), "png".to_string()]),
            exclude_extensions: None,
            follow_symlinks: true,
        };

        let json = serde_json::to_string(&opts).unwrap();
        assert!(json.contains("rootPaths"));
        assert!(json.contains("minFileSize"));
        assert!(json.contains("includeExtensions"));
        assert!(json.contains("followSymlinks"));

        let deserialized: ScanOptions = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.root_paths, opts.root_paths);
        assert_eq!(deserialized.min_file_size, opts.min_file_size);
        assert_eq!(deserialized.follow_symlinks, opts.follow_symlinks);
    }

    #[test]
    fn test_file_entry_creation() {
        let entry = FileEntry::new(
            "/path/to/file.txt".to_string(),
            1024,
            Some("2024-01-15T10:30:00Z".to_string()),
        );

        assert_eq!(entry.path, "/path/to/file.txt");
        assert_eq!(entry.size, 1024);
        assert_eq!(entry.modified, Some("2024-01-15T10:30:00Z".to_string()));
    }

    #[test]
    fn test_file_entry_serialization() {
        let entry = FileEntry::new("/file.txt".to_string(), 512, None);
        let json = serde_json::to_string(&entry).unwrap();

        assert!(json.contains("\"path\":"));
        assert!(json.contains("\"size\":"));

        let deserialized: FileEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, entry);
    }

    #[test]
    fn test_duplicate_group_count() {
        let group = DuplicateGroup::new(
            "abc123".to_string(),
            1024,
            vec![
                FileEntry::new("/file1.txt".to_string(), 1024, None),
                FileEntry::new("/file2.txt".to_string(), 1024, None),
                FileEntry::new("/file3.txt".to_string(), 1024, None),
            ],
        );

        assert_eq!(group.count(), 3);
    }

    #[test]
    fn test_duplicate_group_wasted_space() {
        let group = DuplicateGroup::new(
            "abc123".to_string(),
            1000,
            vec![
                FileEntry::new("/file1.txt".to_string(), 1000, None),
                FileEntry::new("/file2.txt".to_string(), 1000, None),
                FileEntry::new("/file3.txt".to_string(), 1000, None),
            ],
        );

        // 3 files, keeping 1 means 2 are wasted = 2 * 1000 = 2000
        assert_eq!(group.wasted_space(), 2000);
    }

    #[test]
    fn test_duplicate_group_single_file_no_waste() {
        let group = DuplicateGroup::new(
            "abc123".to_string(),
            1000,
            vec![FileEntry::new("/file1.txt".to_string(), 1000, None)],
        );

        assert_eq!(group.wasted_space(), 0);
    }

    #[test]
    fn test_duplicate_group_empty_no_waste() {
        let group = DuplicateGroup::new("abc123".to_string(), 1000, vec![]);
        assert_eq!(group.wasted_space(), 0);
    }

    #[test]
    fn test_scan_progress_creation() {
        let progress = ScanProgress::new(50, Some(100), ScanPhase::Hashing);

        assert_eq!(progress.files_scanned, 50);
        assert_eq!(progress.files_total, Some(100));
        assert_eq!(progress.current_phase, ScanPhase::Hashing);
        assert!(progress.message.is_none());
    }

    #[test]
    fn test_scan_progress_with_message() {
        let progress = ScanProgress::new(10, None, ScanPhase::Counting)
            .with_message("Scanning directory...");

        assert_eq!(progress.message, Some("Scanning directory...".to_string()));
    }

    #[test]
    fn test_scan_phase_serialization() {
        assert_eq!(
            serde_json::to_string(&ScanPhase::Counting).unwrap(),
            "\"counting\""
        );
        assert_eq!(
            serde_json::to_string(&ScanPhase::Hashing).unwrap(),
            "\"hashing\""
        );
        assert_eq!(
            serde_json::to_string(&ScanPhase::Complete).unwrap(),
            "\"complete\""
        );
    }

    #[test]
    fn test_scan_result_calculations() {
        let groups = vec![
            DuplicateGroup::new(
                "hash1".to_string(),
                1000,
                vec![
                    FileEntry::new("/a.txt".to_string(), 1000, None),
                    FileEntry::new("/b.txt".to_string(), 1000, None),
                ],
            ),
            DuplicateGroup::new(
                "hash2".to_string(),
                500,
                vec![
                    FileEntry::new("/c.txt".to_string(), 500, None),
                    FileEntry::new("/d.txt".to_string(), 500, None),
                    FileEntry::new("/e.txt".to_string(), 500, None),
                ],
            ),
        ];

        let result = ScanResult::new(groups, 100, vec![], 1000);

        // 2 + 3 = 5 duplicate files
        assert_eq!(result.total_duplicates_found, 5);
        // (2-1)*1000 + (3-1)*500 = 1000 + 1000 = 2000
        assert_eq!(result.total_wasted_space, 2000);
        assert_eq!(result.total_files_scanned, 100);
        assert_eq!(result.duration_ms, 1000);
    }

    #[test]
    fn test_scan_error_creation() {
        let error = ScanError::new("/path/to/file", "Permission denied");

        assert_eq!(error.path, "/path/to/file");
        assert_eq!(error.message, "Permission denied");
    }

    #[test]
    fn test_delete_result() {
        let result = DeleteResult::new(
            vec!["/file1.txt".to_string(), "/file2.txt".to_string()],
            vec![DeleteError::new("/file3.txt", "File is locked")],
        );

        assert_eq!(result.deleted.len(), 2);
        assert_eq!(result.failed.len(), 1);
        assert!(!result.all_succeeded());
    }

    #[test]
    fn test_delete_result_all_succeeded() {
        let result = DeleteResult::new(
            vec!["/file1.txt".to_string()],
            vec![],
        );

        assert!(result.all_succeeded());
    }

    #[test]
    fn test_delete_error_serialization() {
        let error = DeleteError::new("/file.txt", "Access denied");
        let json = serde_json::to_string(&error).unwrap();

        assert!(json.contains("\"path\":"));
        assert!(json.contains("\"reason\":"));

        let deserialized: DeleteError = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.path, error.path);
        assert_eq!(deserialized.reason, error.reason);
    }
}
