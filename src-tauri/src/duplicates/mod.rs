//! Duplicate detection and grouping module.
//!
//! Groups files by their content hash to identify duplicates.

use crate::types::{DuplicateGroup, FileEntry};
use log::debug;
use std::collections::HashMap;

/// Finds duplicate files by grouping them by hash.
///
/// # Arguments
/// * `files_with_hashes` - List of (FileEntry, hash) tuples
///
/// # Returns
/// A vector of DuplicateGroups, sorted by wasted space (descending).
/// Only groups with 2+ files are included.
pub fn find_duplicates(files_with_hashes: Vec<(FileEntry, String)>) -> Vec<DuplicateGroup> {
    // Group files by hash
    let mut hash_groups: HashMap<String, Vec<FileEntry>> = HashMap::new();

    for (file, hash) in files_with_hashes {
        hash_groups.entry(hash).or_default().push(file);
    }

    // Convert to DuplicateGroups, filtering single-file groups
    let mut groups: Vec<DuplicateGroup> = hash_groups
        .into_iter()
        .filter(|(_, files)| files.len() > 1)
        .map(|(hash, files)| {
            let size = files.first().map(|f| f.size).unwrap_or(0);
            DuplicateGroup::new(hash, size, files)
        })
        .collect();

    // Sort by wasted space (descending) to show biggest savings first
    groups.sort_by_key(|g| std::cmp::Reverse(g.wasted_space()));

    debug!(
        "Found {} duplicate groups with {} total files",
        groups.len(),
        groups.iter().map(|g| g.files.len()).sum::<usize>()
    );

    groups
}

/// Calculates total wasted space across all duplicate groups.
///
/// # Arguments
/// * `groups` - List of duplicate groups
///
/// # Returns
/// Total bytes that could be recovered by removing duplicates.
pub fn calculate_total_wasted_space(groups: &[DuplicateGroup]) -> u64 {
    groups.iter().map(|g| g.wasted_space()).sum()
}

/// Calculates total number of duplicate files across all groups.
///
/// # Arguments
/// * `groups` - List of duplicate groups
///
/// # Returns
/// Total count of files in all groups.
pub fn calculate_total_duplicates(groups: &[DuplicateGroup]) -> u64 {
    groups.iter().map(|g| g.files.len() as u64).sum()
}

/// Filters duplicate groups to only include groups above a minimum wasted space.
///
/// # Arguments
/// * `groups` - List of duplicate groups
/// * `min_wasted` - Minimum wasted space in bytes
///
/// # Returns
/// Filtered list of groups.
pub fn filter_by_min_wasted_space(
    groups: Vec<DuplicateGroup>,
    min_wasted: u64,
) -> Vec<DuplicateGroup> {
    groups
        .into_iter()
        .filter(|g| g.wasted_space() >= min_wasted)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn file(path: &str, size: u64) -> FileEntry {
        FileEntry::new(path.to_string(), size, None)
    }

    #[test]
    fn test_find_duplicates_basic() {
        let files = vec![
            (file("/a.txt", 100), "hash1".to_string()),
            (file("/b.txt", 100), "hash1".to_string()),
            (file("/c.txt", 200), "hash2".to_string()),
            (file("/d.txt", 200), "hash2".to_string()),
            (file("/e.txt", 300), "hash3".to_string()), // Unique
        ];

        let groups = find_duplicates(files);

        assert_eq!(groups.len(), 2);
        // Should be sorted by wasted space - 200 byte group comes first
        assert_eq!(groups[0].size, 200);
        assert_eq!(groups[1].size, 100);
    }

    #[test]
    fn test_find_duplicates_empty() {
        let files: Vec<(FileEntry, String)> = vec![];
        let groups = find_duplicates(files);
        assert!(groups.is_empty());
    }

    #[test]
    fn test_find_duplicates_no_duplicates() {
        let files = vec![
            (file("/a.txt", 100), "hash1".to_string()),
            (file("/b.txt", 200), "hash2".to_string()),
            (file("/c.txt", 300), "hash3".to_string()),
        ];

        let groups = find_duplicates(files);
        assert!(groups.is_empty());
    }

    #[test]
    fn test_find_duplicates_all_same() {
        let files = vec![
            (file("/a.txt", 100), "same".to_string()),
            (file("/b.txt", 100), "same".to_string()),
            (file("/c.txt", 100), "same".to_string()),
            (file("/d.txt", 100), "same".to_string()),
        ];

        let groups = find_duplicates(files);

        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].files.len(), 4);
        assert_eq!(groups[0].hash, "same");
    }

    #[test]
    fn test_find_duplicates_sorted_by_wasted_space() {
        let files = vec![
            // Small files (wasted: 100)
            (file("/small1.txt", 100), "small".to_string()),
            (file("/small2.txt", 100), "small".to_string()),
            // Large files (wasted: 1000)
            (file("/large1.txt", 1000), "large".to_string()),
            (file("/large2.txt", 1000), "large".to_string()),
            // Medium files (wasted: 500)
            (file("/med1.txt", 500), "medium".to_string()),
            (file("/med2.txt", 500), "medium".to_string()),
        ];

        let groups = find_duplicates(files);

        assert_eq!(groups.len(), 3);
        // Should be sorted: large (1000), medium (500), small (100)
        assert_eq!(groups[0].hash, "large");
        assert_eq!(groups[1].hash, "medium");
        assert_eq!(groups[2].hash, "small");
    }

    #[test]
    fn test_calculate_total_wasted_space() {
        let groups = vec![
            DuplicateGroup::new(
                "hash1".to_string(),
                100,
                vec![file("/a.txt", 100), file("/b.txt", 100)],
            ),
            DuplicateGroup::new(
                "hash2".to_string(),
                200,
                vec![
                    file("/c.txt", 200),
                    file("/d.txt", 200),
                    file("/e.txt", 200),
                ],
            ),
        ];

        // (2-1)*100 + (3-1)*200 = 100 + 400 = 500
        assert_eq!(calculate_total_wasted_space(&groups), 500);
    }

    #[test]
    fn test_calculate_total_wasted_space_empty() {
        let groups: Vec<DuplicateGroup> = vec![];
        assert_eq!(calculate_total_wasted_space(&groups), 0);
    }

    #[test]
    fn test_calculate_total_duplicates() {
        let groups = vec![
            DuplicateGroup::new(
                "hash1".to_string(),
                100,
                vec![file("/a.txt", 100), file("/b.txt", 100)],
            ),
            DuplicateGroup::new(
                "hash2".to_string(),
                200,
                vec![
                    file("/c.txt", 200),
                    file("/d.txt", 200),
                    file("/e.txt", 200),
                ],
            ),
        ];

        assert_eq!(calculate_total_duplicates(&groups), 5);
    }

    #[test]
    fn test_filter_by_min_wasted_space() {
        let groups = vec![
            DuplicateGroup::new(
                "small".to_string(),
                100,
                vec![file("/a.txt", 100), file("/b.txt", 100)],
            ), // wasted: 100
            DuplicateGroup::new(
                "large".to_string(),
                1000,
                vec![file("/c.txt", 1000), file("/d.txt", 1000)],
            ), // wasted: 1000
        ];

        let filtered = filter_by_min_wasted_space(groups, 500);

        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].hash, "large");
    }

    #[test]
    fn test_filter_by_min_wasted_space_none_match() {
        let groups = vec![DuplicateGroup::new(
            "small".to_string(),
            100,
            vec![file("/a.txt", 100), file("/b.txt", 100)],
        )];

        let filtered = filter_by_min_wasted_space(groups, 1000);
        assert!(filtered.is_empty());
    }

    #[test]
    fn test_group_preserves_file_metadata() {
        let files = vec![
            (
                FileEntry::new("/a.txt".to_string(), 100, Some("2024-01-01".to_string())),
                "hash".to_string(),
            ),
            (
                FileEntry::new("/b.txt".to_string(), 100, Some("2024-01-02".to_string())),
                "hash".to_string(),
            ),
        ];

        let groups = find_duplicates(files);

        assert_eq!(groups.len(), 1);
        // Metadata should be preserved
        let file1 = &groups[0].files[0];
        let file2 = &groups[0].files[1];
        assert!(file1.modified.is_some() || file2.modified.is_some());
    }
}
