//! Tauri command handlers for the Duplicate File Detector.
//!
//! These commands are invoked from the Svelte frontend via Tauri's IPC.

use crate::duplicates::find_duplicates;
use crate::error::ScannerError;
use crate::hasher::{extract_hash_errors, extract_successful_hashes, hash_files_parallel};
use crate::scanner::{group_by_size, scan_directories};
use crate::state::AppState;
use crate::types::{
    DeleteError, DeleteResult, ScanError, ScanOptions, ScanPhase, ScanProgress,
    ScanResult,
};
use log::{debug, error, info, warn};
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter, State};

/// Rate limiting for progress events (max events per second).
const PROGRESS_RATE_LIMIT_MS: u64 = 100;

/// Event names for frontend communication.
mod events {
    pub const SCAN_PROGRESS: &str = "scan_progress";
    pub const SCAN_FINISHED: &str = "scan_finished";
    pub const SCAN_ERROR: &str = "scan_error";
    pub const SCAN_CANCELLED: &str = "scan_cancelled";
}

/// Starts a duplicate file scan with the given options.
///
/// This command performs the full scan pipeline:
/// 1. Scan directories and collect files
/// 2. Group files by size
/// 3. Hash files in size groups (parallel)
/// 4. Group files by hash to find duplicates
///
/// Progress events are emitted throughout the process.
#[tauri::command]
pub async fn start_scan(
    options: ScanOptions,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<ScanResult, String> {
    info!("Starting scan with {} root paths", options.root_paths.len());

    // Try to start the scan
    let scan_id = state.try_start_scan().ok_or_else(|| {
        String::from(ScannerError::ScanInProgress)
    })?;

    debug!("Scan started with ID: {}", scan_id);

    let start_time = Instant::now();
    let mut all_errors: Vec<ScanError> = Vec::new();

    // Helper to check cancellation and emit cancelled event
    let check_cancel = |state: &AppState, app_handle: &AppHandle| -> bool {
        if state.is_cancel_requested() {
            let _ = app_handle.emit(events::SCAN_CANCELLED, ());
            true
        } else {
            false
        }
    };

    // Phase 1: Scan directories
    emit_progress(&app_handle, 0, None, ScanPhase::Counting, None);

    let scan_output = match scan_directories(&options) {
        Ok(output) => output,
        Err(e) => {
            error!("Scan failed: {}", e);
            state.finish_scan();
            let _ = app_handle.emit(events::SCAN_ERROR, e.to_string());
            return Err(e.into());
        }
    };

    if check_cancel(&state, &app_handle) {
        state.finish_scan();
        return Err(ScannerError::Cancelled.into());
    }

    let total_files = scan_output.files.len() as u64;
    all_errors.extend(scan_output.errors);

    info!("Found {} files in scan", total_files);

    // Phase 2: Group by size
    emit_progress(&app_handle, total_files, Some(total_files), ScanPhase::Grouping, None);

    let size_groups = group_by_size(scan_output.files);
    let files_to_hash: Vec<_> = size_groups.into_values().flatten().collect();
    let files_to_hash_count = files_to_hash.len() as u64;

    info!(
        "{} files in size groups (potential duplicates)",
        files_to_hash_count
    );

    if check_cancel(&state, &app_handle) {
        state.finish_scan();
        return Err(ScannerError::Cancelled.into());
    }

    // Phase 3: Hash files in parallel
    let hashed_count = Arc::new(AtomicU64::new(0));
    let last_emit = Arc::new(AtomicU64::new(0));

    let handle_clone = app_handle.clone();
    let state_clone_for_progress = state.inner().clone();

    let hash_results = hash_files_parallel(files_to_hash, move |count| {
        // Rate-limit progress emissions
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let last = last_emit.load(Ordering::Relaxed);
        if now - last >= PROGRESS_RATE_LIMIT_MS {
            last_emit.store(now, Ordering::Relaxed);
            hashed_count.store(count, Ordering::Relaxed);

            // Check for cancellation during hashing
            if !state_clone_for_progress.is_cancel_requested() {
                emit_progress(
                    &handle_clone,
                    count,
                    Some(files_to_hash_count),
                    ScanPhase::Hashing,
                    None,
                );
            }
        }
    });

    if check_cancel(&state, &app_handle) {
        state.finish_scan();
        return Err(ScannerError::Cancelled.into());
    }

    // Collect hash errors
    for (path, error) in extract_hash_errors(&hash_results) {
        all_errors.push(ScanError::new(path, error));
    }

    let successful_hashes = extract_successful_hashes(hash_results);
    info!("{} files successfully hashed", successful_hashes.len());

    // Phase 4: Find duplicates
    emit_progress(
        &app_handle,
        files_to_hash_count,
        Some(files_to_hash_count),
        ScanPhase::Finalizing,
        None,
    );

    let duplicate_groups = find_duplicates(successful_hashes);

    let duration_ms = start_time.elapsed().as_millis() as u64;

    let result = ScanResult::new(duplicate_groups, total_files, all_errors, duration_ms);

    info!(
        "Scan complete in {}ms: {} duplicate groups, {} wasted bytes",
        duration_ms, result.duplicate_groups.len(), result.total_wasted_space
    );

    // Emit completion
    emit_progress(
        &app_handle,
        total_files,
        Some(total_files),
        ScanPhase::Complete,
        None,
    );

    let _ = app_handle.emit(events::SCAN_FINISHED, &result);

    state.finish_scan();
    Ok(result)
}

/// Cancels the currently running scan.
#[tauri::command]
pub fn cancel_scan(state: State<'_, AppState>) -> Result<(), String> {
    info!("Cancel scan requested");

    if state.request_cancel() {
        Ok(())
    } else {
        Err(String::from(ScannerError::NoActiveScan))
    }
}

/// Deletes the specified files.
///
/// # Arguments
/// * `file_paths` - List of file paths to delete
/// * `use_trash` - If true, move to trash/recycle bin; otherwise permanently delete
#[tauri::command]
pub async fn delete_files(file_paths: Vec<String>, use_trash: bool) -> Result<DeleteResult, String> {
    info!(
        "Delete requested for {} files (use_trash: {})",
        file_paths.len(),
        use_trash
    );

    let mut deleted = Vec::new();
    let mut failed = Vec::new();

    for path_str in file_paths {
        let path = Path::new(&path_str);

        let result = if use_trash {
            trash::delete(path).map_err(|e| e.to_string())
        } else {
            std::fs::remove_file(path).map_err(|e| e.to_string())
        };

        match result {
            Ok(()) => {
                debug!("Deleted: {}", path_str);
                deleted.push(path_str);
            }
            Err(e) => {
                warn!("Failed to delete {}: {}", path_str, e);
                failed.push(DeleteError::new(path_str, e));
            }
        }
    }

    info!(
        "Delete complete: {} succeeded, {} failed",
        deleted.len(),
        failed.len()
    );

    Ok(DeleteResult::new(deleted, failed))
}

/// Opens a folder selection dialog and returns the selected paths.
#[tauri::command]
pub async fn select_folders(app_handle: AppHandle) -> Result<Vec<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = tokio::sync::oneshot::channel();

    app_handle
        .dialog()
        .file()
        .set_title("Select Folders to Scan")
        .pick_folders(move |paths| {
            let _ = tx.send(paths);
        });

    match rx.await {
        Ok(Some(paths)) => {
            let path_strings: Vec<String> = paths
                .into_iter()
                .map(|p| p.to_string())
                .collect();

            info!("Selected {} folders", path_strings.len());
            Ok(path_strings)
        }
        Ok(None) => {
            debug!("Folder selection cancelled");
            Ok(Vec::new())
        }
        Err(_) => {
            Err("Dialog channel closed unexpectedly".to_string())
        }
    }
}

/// Emits a progress event to the frontend.
fn emit_progress(
    app_handle: &AppHandle,
    files_scanned: u64,
    files_total: Option<u64>,
    phase: ScanPhase,
    message: Option<String>,
) {
    let mut progress = ScanProgress::new(files_scanned, files_total, phase);
    if let Some(msg) = message {
        progress = progress.with_message(msg);
    }

    let _ = app_handle.emit(events::SCAN_PROGRESS, progress);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_events_module() {
        // Verify event names are correct
        assert_eq!(events::SCAN_PROGRESS, "scan_progress");
        assert_eq!(events::SCAN_FINISHED, "scan_finished");
        assert_eq!(events::SCAN_ERROR, "scan_error");
        assert_eq!(events::SCAN_CANCELLED, "scan_cancelled");
    }
}
