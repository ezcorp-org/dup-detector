//! Directory scanning module for the Duplicate File Detector.
//!
//! Provides efficient recursive directory traversal with filtering support.

pub mod filter;

use crate::error::{ScannerError, ScannerResult};
use crate::types::{FileEntry, ScanError, ScanOptions};
use filter::FileFilter;
use log::{debug, warn};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use walkdir::{DirEntry, WalkDir};

/// Result of scanning directories, including files and any errors encountered.
#[derive(Debug)]
pub struct ScanOutput {
    /// Files that passed filtering.
    pub files: Vec<FileEntry>,

    /// Non-fatal errors encountered during scanning.
    pub errors: Vec<ScanError>,
}

impl ScanOutput {
    /// Creates a new empty ScanOutput.
    pub fn new() -> Self {
        Self {
            files: Vec::new(),
            errors: Vec::new(),
        }
    }

    /// Adds a file to the output.
    pub fn add_file(&mut self, entry: FileEntry) {
        self.files.push(entry);
    }

    /// Adds an error to the output.
    pub fn add_error(&mut self, error: ScanError) {
        self.errors.push(error);
    }
}

impl Default for ScanOutput {
    fn default() -> Self {
        Self::new()
    }
}

/// Scans directories for files matching the given options.
///
/// # Arguments
/// * `options` - Scan configuration including paths and filters
///
/// # Returns
/// A ScanOutput containing matching files and any errors encountered.
pub fn scan_directories(options: &ScanOptions) -> ScannerResult<ScanOutput> {
    let paths: Vec<PathBuf> = options
        .root_paths
        .iter()
        .map(PathBuf::from)
        .collect();

    // Validate paths exist
    for path in &paths {
        if !path.exists() {
            return Err(ScannerError::PathNotFound(path.display().to_string()));
        }
    }

    // Build filter from options
    let filter = build_filter(options);

    let mut output = ScanOutput::new();

    for root_path in &paths {
        scan_directory(root_path, options.follow_symlinks, &filter, &mut output);
    }

    debug!(
        "Scan complete: {} files found, {} errors",
        output.files.len(),
        output.errors.len()
    );

    Ok(output)
}

/// Scans a single directory tree.
fn scan_directory(
    root: &Path,
    follow_symlinks: bool,
    filter: &FileFilter,
    output: &mut ScanOutput,
) {
    let walker = WalkDir::new(root)
        .follow_links(follow_symlinks)
        .into_iter();

    for entry_result in walker {
        match entry_result {
            Ok(entry) => {
                if let Err(e) = process_entry(&entry, filter, output) {
                    // Log but continue - these are recoverable errors
                    warn!("Error processing entry: {}", e);
                }
            }
            Err(e) => {
                // WalkDir error - permission denied, symlink loop, etc.
                let path = e.path().map(|p| p.display().to_string()).unwrap_or_default();
                let message = e.to_string();
                output.add_error(ScanError::new(path, message));
            }
        }
    }
}

/// Processes a single directory entry.
fn process_entry(
    entry: &DirEntry,
    filter: &FileFilter,
    output: &mut ScanOutput,
) -> ScannerResult<()> {
    // Skip directories
    if entry.file_type().is_dir() {
        return Ok(());
    }

    // Get file metadata
    let metadata = entry.metadata().map_err(|e| {
        ScannerError::Io(std::io::Error::other(e.to_string()))
    })?;

    let size = metadata.len();
    let path = entry.path();

    // Apply filters
    if !filter.matches(path, size) {
        return Ok(());
    }

    // Get modification time
    let modified = metadata
        .modified()
        .ok()
        .and_then(format_system_time);

    let file_entry = FileEntry::new(
        path.display().to_string(),
        size,
        modified,
    );

    output.add_file(file_entry);
    Ok(())
}

/// Builds a FileFilter from ScanOptions.
fn build_filter(options: &ScanOptions) -> FileFilter {
    let mut filter = FileFilter::new();

    if let Some(min_size) = options.min_file_size {
        filter = filter.with_min_size(min_size);
    }

    if let Some(ref includes) = options.include_extensions {
        filter = filter.with_include_extensions(includes.clone());
    }

    if let Some(ref excludes) = options.exclude_extensions {
        filter = filter.with_exclude_extensions(excludes.clone());
    }

    filter
}

/// Formats a SystemTime as an ISO 8601 string.
fn format_system_time(time: SystemTime) -> Option<String> {
    time.duration_since(SystemTime::UNIX_EPOCH)
        .ok()
        .map(|d| {
            // Simple ISO 8601 format
            let secs = d.as_secs();
            // This is a simplified format - in production you might use chrono
            format!("{}", secs)
        })
}

/// Groups files by their size.
///
/// This is an optimization step - files with unique sizes can't be duplicates,
/// so we only need to hash files that share a size with at least one other file.
///
/// # Arguments
/// * `files` - List of file entries to group
///
/// # Returns
/// A HashMap where keys are file sizes and values are lists of files with that size.
/// Only groups with 2+ files are included (potential duplicates).
pub fn group_by_size(files: Vec<FileEntry>) -> HashMap<u64, Vec<FileEntry>> {
    let mut size_groups: HashMap<u64, Vec<FileEntry>> = HashMap::new();

    for file in files {
        size_groups.entry(file.size).or_default().push(file);
    }

    // Remove groups with only one file - they can't be duplicates
    size_groups.retain(|_, v| v.len() > 1);

    debug!(
        "Grouped files by size: {} size groups with potential duplicates",
        size_groups.len()
    );

    size_groups
}

/// Returns the total number of files across all size groups.
pub fn count_files_in_groups(groups: &HashMap<u64, Vec<FileEntry>>) -> usize {
    groups.values().map(|v| v.len()).sum()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs::{self, File};
    use std::io::Write;

    fn create_test_file(dir: &Path, name: &str, content: &[u8]) -> PathBuf {
        let path = dir.join(name);
        let mut file = File::create(&path).unwrap();
        file.write_all(content).unwrap();
        path
    }

    #[test]
    fn test_scan_empty_directory() {
        let temp_dir = TempDir::new().unwrap();
        let options = ScanOptions {
            root_paths: vec![temp_dir.path().display().to_string()],
            ..Default::default()
        };

        let result = scan_directories(&options).unwrap();
        assert!(result.files.is_empty());
        assert!(result.errors.is_empty());
    }

    #[test]
    fn test_scan_with_files() {
        let temp_dir = TempDir::new().unwrap();
        create_test_file(temp_dir.path(), "file1.txt", b"hello");
        create_test_file(temp_dir.path(), "file2.txt", b"world");

        let options = ScanOptions {
            root_paths: vec![temp_dir.path().display().to_string()],
            ..Default::default()
        };

        let result = scan_directories(&options).unwrap();
        assert_eq!(result.files.len(), 2);
    }

    #[test]
    fn test_scan_nested_directories() {
        let temp_dir = TempDir::new().unwrap();
        let sub_dir = temp_dir.path().join("subdir");
        fs::create_dir(&sub_dir).unwrap();

        create_test_file(temp_dir.path(), "root.txt", b"root");
        create_test_file(&sub_dir, "nested.txt", b"nested");

        let options = ScanOptions {
            root_paths: vec![temp_dir.path().display().to_string()],
            ..Default::default()
        };

        let result = scan_directories(&options).unwrap();
        assert_eq!(result.files.len(), 2);
    }

    #[test]
    fn test_scan_with_min_size_filter() {
        let temp_dir = TempDir::new().unwrap();
        create_test_file(temp_dir.path(), "small.txt", b"hi");
        create_test_file(temp_dir.path(), "large.txt", b"hello world this is larger");

        let options = ScanOptions {
            root_paths: vec![temp_dir.path().display().to_string()],
            min_file_size: Some(10),
            ..Default::default()
        };

        let result = scan_directories(&options).unwrap();
        assert_eq!(result.files.len(), 1);
        assert!(result.files[0].path.contains("large.txt"));
    }

    #[test]
    fn test_scan_with_extension_filter() {
        let temp_dir = TempDir::new().unwrap();
        create_test_file(temp_dir.path(), "doc.txt", b"text");
        create_test_file(temp_dir.path(), "image.jpg", b"image");
        create_test_file(temp_dir.path(), "data.json", b"json");

        let options = ScanOptions {
            root_paths: vec![temp_dir.path().display().to_string()],
            include_extensions: Some(vec!["txt".to_string(), "json".to_string()]),
            ..Default::default()
        };

        let result = scan_directories(&options).unwrap();
        assert_eq!(result.files.len(), 2);
    }

    #[test]
    fn test_scan_nonexistent_path() {
        let options = ScanOptions {
            root_paths: vec!["/this/path/does/not/exist".to_string()],
            ..Default::default()
        };

        let result = scan_directories(&options);
        assert!(matches!(result, Err(ScannerError::PathNotFound(_))));
    }

    #[test]
    fn test_group_by_size_basic() {
        let files = vec![
            FileEntry::new("/a.txt".to_string(), 100, None),
            FileEntry::new("/b.txt".to_string(), 100, None),
            FileEntry::new("/c.txt".to_string(), 200, None),
            FileEntry::new("/d.txt".to_string(), 200, None),
            FileEntry::new("/e.txt".to_string(), 300, None), // Unique size
        ];

        let groups = group_by_size(files);

        // Only sizes 100 and 200 have duplicates
        assert_eq!(groups.len(), 2);
        assert!(groups.contains_key(&100));
        assert!(groups.contains_key(&200));
        assert!(!groups.contains_key(&300)); // Unique size removed

        assert_eq!(groups.get(&100).unwrap().len(), 2);
        assert_eq!(groups.get(&200).unwrap().len(), 2);
    }

    #[test]
    fn test_group_by_size_empty() {
        let files: Vec<FileEntry> = vec![];
        let groups = group_by_size(files);
        assert!(groups.is_empty());
    }

    #[test]
    fn test_group_by_size_all_unique() {
        let files = vec![
            FileEntry::new("/a.txt".to_string(), 100, None),
            FileEntry::new("/b.txt".to_string(), 200, None),
            FileEntry::new("/c.txt".to_string(), 300, None),
        ];

        let groups = group_by_size(files);
        assert!(groups.is_empty()); // All unique, no groups
    }

    #[test]
    fn test_count_files_in_groups() {
        let mut groups = HashMap::new();
        groups.insert(100, vec![
            FileEntry::new("/a.txt".to_string(), 100, None),
            FileEntry::new("/b.txt".to_string(), 100, None),
        ]);
        groups.insert(200, vec![
            FileEntry::new("/c.txt".to_string(), 200, None),
            FileEntry::new("/d.txt".to_string(), 200, None),
            FileEntry::new("/e.txt".to_string(), 200, None),
        ]);

        assert_eq!(count_files_in_groups(&groups), 5);
    }

    #[test]
    fn test_scan_output_new() {
        let output = ScanOutput::new();
        assert!(output.files.is_empty());
        assert!(output.errors.is_empty());
    }

    #[test]
    fn test_scan_output_add_file() {
        let mut output = ScanOutput::new();
        output.add_file(FileEntry::new("/test.txt".to_string(), 100, None));

        assert_eq!(output.files.len(), 1);
    }

    #[test]
    fn test_scan_output_add_error() {
        let mut output = ScanOutput::new();
        output.add_error(ScanError::new("/bad/path", "Permission denied"));

        assert_eq!(output.errors.len(), 1);
        assert_eq!(output.errors[0].path, "/bad/path");
    }

    #[test]
    fn test_file_entry_contains_size() {
        let temp_dir = TempDir::new().unwrap();
        let content = b"hello world";
        create_test_file(temp_dir.path(), "test.txt", content);

        let options = ScanOptions {
            root_paths: vec![temp_dir.path().display().to_string()],
            ..Default::default()
        };

        let result = scan_directories(&options).unwrap();
        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files[0].size, content.len() as u64);
    }
}
