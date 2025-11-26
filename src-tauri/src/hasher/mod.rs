//! MD5 hashing module for the Duplicate File Detector.
//!
//! Provides buffered file hashing with parallel processing support.

use crate::error::{ScannerError, ScannerResult};
use crate::types::FileEntry;
use log::{debug, warn};
use md5::{Digest, Md5};
use rayon::prelude::*;
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

/// Buffer size for reading files (64 KB).
/// This is a good balance between memory usage and I/O efficiency.
const BUFFER_SIZE: usize = 64 * 1024;

/// Computes the MD5 hash of a file using buffered I/O.
///
/// # Arguments
/// * `path` - Path to the file to hash
///
/// # Returns
/// The MD5 hash as a lowercase hexadecimal string.
pub fn hash_file(path: &Path) -> ScannerResult<String> {
    let file = File::open(path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            ScannerError::FileDisappeared(path.display().to_string())
        } else if e.kind() == std::io::ErrorKind::PermissionDenied {
            ScannerError::PermissionDenied(path.display().to_string())
        } else {
            ScannerError::Io(e)
        }
    })?;

    let mut reader = BufReader::with_capacity(BUFFER_SIZE, file);
    let mut hasher = Md5::new();
    let mut buffer = vec![0u8; BUFFER_SIZE];

    loop {
        let bytes_read = reader.read(&mut buffer).map_err(|e| {
            if e.kind() == std::io::ErrorKind::PermissionDenied {
                ScannerError::PermissionDenied(path.display().to_string())
            } else {
                ScannerError::Io(e)
            }
        })?;

        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
    }

    let hash = hasher.finalize();
    Ok(format!("{:x}", hash))
}

/// Result of hashing a file.
#[derive(Debug)]
pub struct HashResult {
    /// The file entry that was hashed.
    pub file: FileEntry,

    /// The hash result (Ok) or error (Err).
    pub hash: Result<String, String>,
}

impl HashResult {
    /// Creates a successful hash result.
    pub fn success(file: FileEntry, hash: String) -> Self {
        Self {
            file,
            hash: Ok(hash),
        }
    }

    /// Creates a failed hash result.
    pub fn failure(file: FileEntry, error: String) -> Self {
        Self {
            file,
            hash: Err(error),
        }
    }

    /// Returns true if hashing was successful.
    pub fn is_success(&self) -> bool {
        self.hash.is_ok()
    }
}

/// Hashes multiple files in parallel using Rayon.
///
/// # Arguments
/// * `files` - List of files to hash
/// * `progress_callback` - Called after each file is hashed with the current count
///
/// # Returns
/// A vector of HashResults, one for each input file.
pub fn hash_files_parallel<F>(files: Vec<FileEntry>, progress_callback: F) -> Vec<HashResult>
where
    F: Fn(u64) + Send + Sync,
{
    let progress_counter = Arc::new(AtomicU64::new(0));
    let callback = Arc::new(progress_callback);

    debug!("Starting parallel hashing of {} files", files.len());

    let results: Vec<HashResult> = files
        .into_par_iter()
        .map(|file| {
            let path = Path::new(&file.path);
            let result = match hash_file(path) {
                Ok(hash) => HashResult::success(file, hash),
                Err(e) => {
                    warn!("Failed to hash {}: {}", path.display(), e);
                    HashResult::failure(file, e.to_string())
                }
            };

            // Update progress
            let count = progress_counter.fetch_add(1, Ordering::Relaxed) + 1;
            callback(count);

            result
        })
        .collect();

    debug!(
        "Parallel hashing complete: {} succeeded, {} failed",
        results.iter().filter(|r| r.is_success()).count(),
        results.iter().filter(|r| !r.is_success()).count()
    );

    results
}

/// Extracts successful hashes from hash results.
///
/// # Returns
/// A vector of (FileEntry, hash) tuples for successfully hashed files.
pub fn extract_successful_hashes(results: Vec<HashResult>) -> Vec<(FileEntry, String)> {
    results
        .into_iter()
        .filter_map(|r| match r.hash {
            Ok(hash) => Some((r.file, hash)),
            Err(_) => None,
        })
        .collect()
}

/// Extracts errors from hash results.
///
/// # Returns
/// A vector of (path, error message) tuples for failed hashes.
pub fn extract_hash_errors(results: &[HashResult]) -> Vec<(String, String)> {
    results
        .iter()
        .filter_map(|r| match &r.hash {
            Err(msg) => Some((r.file.path.clone(), msg.clone())),
            Ok(_) => None,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use std::sync::atomic::AtomicU64;
    use tempfile::TempDir;

    fn create_test_file(dir: &Path, name: &str, content: &[u8]) -> PathBuf {
        let path = dir.join(name);
        let mut file = File::create(&path).unwrap();
        file.write_all(content).unwrap();
        path
    }

    use std::path::PathBuf;

    #[test]
    fn test_hash_file_basic() {
        let temp_dir = TempDir::new().unwrap();
        let path = create_test_file(temp_dir.path(), "test.txt", b"hello world");

        let hash = hash_file(&path).unwrap();

        // MD5 of "hello world" is known
        assert_eq!(hash, "5eb63bbbe01eeed093cb22bb8f5acdc3");
    }

    #[test]
    fn test_hash_file_empty() {
        let temp_dir = TempDir::new().unwrap();
        let path = create_test_file(temp_dir.path(), "empty.txt", b"");

        let hash = hash_file(&path).unwrap();

        // MD5 of empty string
        assert_eq!(hash, "d41d8cd98f00b204e9800998ecf8427e");
    }

    #[test]
    fn test_hash_file_not_found() {
        let path = PathBuf::from("/nonexistent/file.txt");
        let result = hash_file(&path);

        assert!(matches!(result, Err(ScannerError::FileDisappeared(_))));
    }

    #[test]
    fn test_hash_file_large() {
        let temp_dir = TempDir::new().unwrap();
        // Create a file larger than BUFFER_SIZE
        let content: Vec<u8> = (0..BUFFER_SIZE * 3).map(|i| (i % 256) as u8).collect();
        let path = create_test_file(temp_dir.path(), "large.bin", &content);

        let hash = hash_file(&path).unwrap();

        // Just verify it returns a valid 32-char hex string
        assert_eq!(hash.len(), 32);
        assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_hash_file_consistent() {
        let temp_dir = TempDir::new().unwrap();
        let path = create_test_file(temp_dir.path(), "test.txt", b"consistent content");

        let hash1 = hash_file(&path).unwrap();
        let hash2 = hash_file(&path).unwrap();

        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_hash_files_parallel() {
        let temp_dir = TempDir::new().unwrap();
        let path1 = create_test_file(temp_dir.path(), "file1.txt", b"content1");
        let path2 = create_test_file(temp_dir.path(), "file2.txt", b"content2");
        let path3 = create_test_file(temp_dir.path(), "file3.txt", b"content1"); // Same as file1

        let files = vec![
            FileEntry::new(path1.display().to_string(), 8, None),
            FileEntry::new(path2.display().to_string(), 8, None),
            FileEntry::new(path3.display().to_string(), 8, None),
        ];

        let progress_count = Arc::new(AtomicU64::new(0));
        let count_clone = Arc::clone(&progress_count);

        let results = hash_files_parallel(files, move |count| {
            count_clone.store(count, Ordering::Relaxed);
        });

        assert_eq!(results.len(), 3);
        assert!(results.iter().all(|r| r.is_success()));

        // Progress should reach 3
        assert_eq!(progress_count.load(Ordering::Relaxed), 3);

        // File1 and File3 should have the same hash
        let hash1 = results[0].hash.as_ref().unwrap();
        let hash3 = results[2].hash.as_ref().unwrap();
        assert_eq!(hash1, hash3);

        // File2 should be different
        let hash2 = results[1].hash.as_ref().unwrap();
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_hash_files_parallel_with_missing_file() {
        let temp_dir = TempDir::new().unwrap();
        let path1 = create_test_file(temp_dir.path(), "exists.txt", b"content");

        let files = vec![
            FileEntry::new(path1.display().to_string(), 7, None),
            FileEntry::new("/nonexistent/file.txt".to_string(), 0, None),
        ];

        let results = hash_files_parallel(files, |_| {});

        assert_eq!(results.len(), 2);
        assert!(results[0].is_success());
        assert!(!results[1].is_success());
    }

    #[test]
    fn test_extract_successful_hashes() {
        let results = vec![
            HashResult::success(
                FileEntry::new("/a.txt".to_string(), 10, None),
                "abc123".to_string(),
            ),
            HashResult::failure(
                FileEntry::new("/b.txt".to_string(), 10, None),
                "error".to_string(),
            ),
            HashResult::success(
                FileEntry::new("/c.txt".to_string(), 10, None),
                "def456".to_string(),
            ),
        ];

        let successful = extract_successful_hashes(results);

        assert_eq!(successful.len(), 2);
        assert_eq!(successful[0].1, "abc123");
        assert_eq!(successful[1].1, "def456");
    }

    #[test]
    fn test_extract_hash_errors() {
        let results = vec![
            HashResult::success(
                FileEntry::new("/a.txt".to_string(), 10, None),
                "abc123".to_string(),
            ),
            HashResult::failure(
                FileEntry::new("/b.txt".to_string(), 10, None),
                "error1".to_string(),
            ),
            HashResult::failure(
                FileEntry::new("/c.txt".to_string(), 10, None),
                "error2".to_string(),
            ),
        ];

        let errors = extract_hash_errors(&results);

        assert_eq!(errors.len(), 2);
        assert_eq!(errors[0].0, "/b.txt");
        assert_eq!(errors[0].1, "error1");
    }

    #[test]
    fn test_hash_result_is_success() {
        let success = HashResult::success(
            FileEntry::new("/test.txt".to_string(), 10, None),
            "hash".to_string(),
        );
        let failure = HashResult::failure(
            FileEntry::new("/test.txt".to_string(), 10, None),
            "error".to_string(),
        );

        assert!(success.is_success());
        assert!(!failure.is_success());
    }

    #[test]
    fn test_hash_binary_file() {
        let temp_dir = TempDir::new().unwrap();
        // Binary content with null bytes and high bytes
        let content: Vec<u8> = (0..256).map(|i| i as u8).collect();
        let path = create_test_file(temp_dir.path(), "binary.bin", &content);

        let hash = hash_file(&path).unwrap();

        assert_eq!(hash.len(), 32);
        assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
