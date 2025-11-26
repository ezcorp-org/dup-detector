//! Duplicate File Detector - Tauri Backend
//!
//! This crate provides the Rust backend for the Duplicate File Detector application.
//! It includes modules for:
//! - Directory scanning with filtering
//! - MD5 hashing with parallel processing
//! - Duplicate detection and grouping
//! - Tauri command handlers
//! - Thread-safe state management

pub mod commands;
pub mod duplicates;
pub mod error;
pub mod hasher;
pub mod scanner;
pub mod state;
pub mod types;

use state::AppState;

/// Runs the Tauri application.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("info"),
    )
    .format_timestamp_millis()
    .init();

    log::info!("Starting Duplicate File Detector");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::start_scan,
            commands::cancel_scan,
            commands::delete_files,
            commands::select_folders,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_modules_accessible() {
        // Verify all modules are properly exported
        let _ = types::ScanOptions::default();
        let _ = error::ScannerError::Cancelled;
        let _ = state::AppState::new();
    }
}
