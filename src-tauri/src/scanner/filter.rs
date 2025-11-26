//! File filtering logic for the scanner.
//!
//! Provides efficient filtering based on file size and extensions.

use std::collections::HashSet;
use std::path::Path;

/// Filter configuration for file scanning.
#[derive(Debug, Clone)]
pub struct FileFilter {
    /// Minimum file size in bytes.
    min_size: Option<u64>,

    /// Extensions to include (lowercase, without dot).
    include_extensions: Option<HashSet<String>>,

    /// Extensions to exclude (lowercase, without dot).
    exclude_extensions: Option<HashSet<String>>,
}

impl FileFilter {
    /// Creates a new FileFilter with no restrictions.
    pub fn new() -> Self {
        Self {
            min_size: None,
            include_extensions: None,
            exclude_extensions: None,
        }
    }

    /// Sets the minimum file size filter.
    pub fn with_min_size(mut self, size: u64) -> Self {
        self.min_size = Some(size);
        self
    }

    /// Sets the extensions to include (case-insensitive).
    pub fn with_include_extensions(mut self, extensions: Vec<String>) -> Self {
        if extensions.is_empty() {
            self.include_extensions = None;
        } else {
            self.include_extensions = Some(
                extensions
                    .into_iter()
                    .map(|e| e.to_lowercase().trim_start_matches('.').to_string())
                    .collect(),
            );
        }
        self
    }

    /// Sets the extensions to exclude (case-insensitive).
    pub fn with_exclude_extensions(mut self, extensions: Vec<String>) -> Self {
        if extensions.is_empty() {
            self.exclude_extensions = None;
        } else {
            self.exclude_extensions = Some(
                extensions
                    .into_iter()
                    .map(|e| e.to_lowercase().trim_start_matches('.').to_string())
                    .collect(),
            );
        }
        self
    }

    /// Checks if a file matches the filter criteria.
    ///
    /// # Arguments
    /// * `path` - Path to the file
    /// * `size` - Size of the file in bytes
    ///
    /// # Returns
    /// `true` if the file should be included, `false` otherwise.
    pub fn matches(&self, path: &Path, size: u64) -> bool {
        // Check minimum size
        if let Some(min_size) = self.min_size {
            if size < min_size {
                return false;
            }
        }

        // Get the file extension
        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase());

        // Check exclude extensions first (takes precedence)
        if let Some(ref excludes) = self.exclude_extensions {
            if let Some(ref ext) = extension {
                if excludes.contains(ext) {
                    return false;
                }
            }
        }

        // Check include extensions
        if let Some(ref includes) = self.include_extensions {
            match extension {
                Some(ref ext) => {
                    if !includes.contains(ext) {
                        return false;
                    }
                }
                None => {
                    // No extension - only include if empty string is in includes
                    if !includes.contains("") {
                        return false;
                    }
                }
            }
        }

        true
    }

    /// Checks if the filter has any restrictions.
    pub fn has_restrictions(&self) -> bool {
        self.min_size.is_some()
            || self.include_extensions.is_some()
            || self.exclude_extensions.is_some()
    }
}

impl Default for FileFilter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_no_filter() {
        let filter = FileFilter::new();
        let path = PathBuf::from("/test/file.txt");

        assert!(filter.matches(&path, 0));
        assert!(filter.matches(&path, 1000));
        assert!(filter.matches(&path, u64::MAX));
    }

    #[test]
    fn test_min_size_filter() {
        let filter = FileFilter::new().with_min_size(1024);
        let path = PathBuf::from("/test/file.txt");

        assert!(!filter.matches(&path, 0));
        assert!(!filter.matches(&path, 1023));
        assert!(filter.matches(&path, 1024));
        assert!(filter.matches(&path, 2048));
    }

    #[test]
    fn test_include_extensions() {
        let filter =
            FileFilter::new().with_include_extensions(vec!["jpg".to_string(), "png".to_string()]);

        assert!(filter.matches(&PathBuf::from("/test/photo.jpg"), 100));
        assert!(filter.matches(&PathBuf::from("/test/photo.JPG"), 100)); // Case insensitive
        assert!(filter.matches(&PathBuf::from("/test/image.png"), 100));
        assert!(!filter.matches(&PathBuf::from("/test/document.pdf"), 100));
        assert!(!filter.matches(&PathBuf::from("/test/noextension"), 100));
    }

    #[test]
    fn test_include_extensions_with_dot() {
        let filter =
            FileFilter::new().with_include_extensions(vec![".jpg".to_string(), ".png".to_string()]);

        // Should work the same - dots are stripped
        assert!(filter.matches(&PathBuf::from("/test/photo.jpg"), 100));
        assert!(filter.matches(&PathBuf::from("/test/image.png"), 100));
    }

    #[test]
    fn test_exclude_extensions() {
        let filter =
            FileFilter::new().with_exclude_extensions(vec!["tmp".to_string(), "bak".to_string()]);

        assert!(filter.matches(&PathBuf::from("/test/file.txt"), 100));
        assert!(filter.matches(&PathBuf::from("/test/file.jpg"), 100));
        assert!(!filter.matches(&PathBuf::from("/test/file.tmp"), 100));
        assert!(!filter.matches(&PathBuf::from("/test/file.TMP"), 100)); // Case insensitive
        assert!(!filter.matches(&PathBuf::from("/test/file.bak"), 100));
    }

    #[test]
    fn test_exclude_takes_precedence() {
        // Include jpg and png, but exclude png
        let filter = FileFilter::new()
            .with_include_extensions(vec!["jpg".to_string(), "png".to_string()])
            .with_exclude_extensions(vec!["png".to_string()]);

        assert!(filter.matches(&PathBuf::from("/test/photo.jpg"), 100));
        assert!(!filter.matches(&PathBuf::from("/test/image.png"), 100)); // Excluded
    }

    #[test]
    fn test_combined_filters() {
        let filter = FileFilter::new()
            .with_min_size(1024)
            .with_include_extensions(vec!["jpg".to_string()])
            .with_exclude_extensions(vec!["tmp".to_string()]);

        // Too small
        assert!(!filter.matches(&PathBuf::from("/test/photo.jpg"), 500));

        // Right size, right extension
        assert!(filter.matches(&PathBuf::from("/test/photo.jpg"), 2048));

        // Right size, wrong extension
        assert!(!filter.matches(&PathBuf::from("/test/document.pdf"), 2048));

        // Excluded extension
        assert!(!filter.matches(&PathBuf::from("/test/file.tmp"), 2048));
    }

    #[test]
    fn test_file_without_extension() {
        let filter = FileFilter::new().with_include_extensions(vec!["txt".to_string()]);

        assert!(!filter.matches(&PathBuf::from("/test/README"), 100));
        assert!(filter.matches(&PathBuf::from("/test/README.txt"), 100));
    }

    #[test]
    fn test_empty_extension_lists() {
        let filter = FileFilter::new()
            .with_include_extensions(vec![])
            .with_exclude_extensions(vec![]);

        // Empty lists should not filter anything
        assert!(filter.matches(&PathBuf::from("/test/file.txt"), 100));
        assert!(filter.matches(&PathBuf::from("/test/file.jpg"), 100));
    }

    #[test]
    fn test_has_restrictions() {
        let no_filter = FileFilter::new();
        assert!(!no_filter.has_restrictions());

        let size_filter = FileFilter::new().with_min_size(100);
        assert!(size_filter.has_restrictions());

        let include_filter = FileFilter::new().with_include_extensions(vec!["txt".to_string()]);
        assert!(include_filter.has_restrictions());

        let exclude_filter = FileFilter::new().with_exclude_extensions(vec!["tmp".to_string()]);
        assert!(exclude_filter.has_restrictions());
    }

    #[test]
    fn test_default() {
        let filter = FileFilter::default();
        assert!(!filter.has_restrictions());
    }

    #[test]
    fn test_multiple_dots_in_filename() {
        let filter = FileFilter::new().with_include_extensions(vec!["gz".to_string()]);

        assert!(filter.matches(&PathBuf::from("/test/archive.tar.gz"), 100));
        assert!(!filter.matches(&PathBuf::from("/test/archive.tar"), 100));
    }
}
