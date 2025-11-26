//! Application state management for the Duplicate File Detector.
//!
//! Provides thread-safe state for tracking scan status and cancellation.

use parking_lot::RwLock;
use std::sync::atomic::{AtomicBool, Ordering};

/// Thread-safe application state.
#[derive(Debug, Default)]
pub struct AppState {
    /// Whether a scan is currently in progress.
    is_scanning: AtomicBool,

    /// Whether cancellation has been requested.
    cancel_requested: AtomicBool,

    /// Current scan ID for matching events.
    current_scan_id: RwLock<Option<String>>,
}

impl AppState {
    /// Creates a new AppState with default values.
    pub fn new() -> Self {
        Self {
            is_scanning: AtomicBool::new(false),
            cancel_requested: AtomicBool::new(false),
            current_scan_id: RwLock::new(None),
        }
    }

    /// Returns whether a scan is currently in progress.
    pub fn is_scanning(&self) -> bool {
        self.is_scanning.load(Ordering::SeqCst)
    }

    /// Attempts to start a new scan.
    ///
    /// Returns the scan ID if successful, or None if a scan is already in progress.
    pub fn try_start_scan(&self) -> Option<String> {
        // Try to atomically set is_scanning from false to true
        if self
            .is_scanning
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_ok()
        {
            // Generate a new scan ID
            let scan_id = generate_scan_id();
            *self.current_scan_id.write() = Some(scan_id.clone());
            self.cancel_requested.store(false, Ordering::SeqCst);
            Some(scan_id)
        } else {
            None
        }
    }

    /// Marks the current scan as complete.
    pub fn finish_scan(&self) {
        self.is_scanning.store(false, Ordering::SeqCst);
        self.cancel_requested.store(false, Ordering::SeqCst);
        *self.current_scan_id.write() = None;
    }

    /// Requests cancellation of the current scan.
    ///
    /// Returns true if a scan was running and cancellation was requested.
    pub fn request_cancel(&self) -> bool {
        if self.is_scanning() {
            self.cancel_requested.store(true, Ordering::SeqCst);
            true
        } else {
            false
        }
    }

    /// Returns whether cancellation has been requested.
    pub fn is_cancel_requested(&self) -> bool {
        self.cancel_requested.load(Ordering::SeqCst)
    }

    /// Returns the current scan ID if a scan is in progress.
    pub fn current_scan_id(&self) -> Option<String> {
        self.current_scan_id.read().clone()
    }

    /// Resets the state to initial values.
    /// Used primarily for testing.
    pub fn reset(&self) {
        self.is_scanning.store(false, Ordering::SeqCst);
        self.cancel_requested.store(false, Ordering::SeqCst);
        *self.current_scan_id.write() = None;
    }
}

/// Generates a unique scan ID.
fn generate_scan_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    format!("scan_{}", timestamp)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::thread;

    #[test]
    fn test_initial_state() {
        let state = AppState::new();

        assert!(!state.is_scanning());
        assert!(!state.is_cancel_requested());
        assert!(state.current_scan_id().is_none());
    }

    #[test]
    fn test_start_scan() {
        let state = AppState::new();

        let scan_id = state.try_start_scan();

        assert!(scan_id.is_some());
        assert!(state.is_scanning());
        assert!(state.current_scan_id().is_some());
        assert!(!state.is_cancel_requested());
    }

    #[test]
    fn test_start_scan_while_scanning() {
        let state = AppState::new();

        // Start first scan
        let first_id = state.try_start_scan();
        assert!(first_id.is_some());

        // Try to start second scan - should fail
        let second_id = state.try_start_scan();
        assert!(second_id.is_none());

        // First scan ID should still be active
        assert_eq!(state.current_scan_id(), first_id);
    }

    #[test]
    fn test_finish_scan() {
        let state = AppState::new();

        state.try_start_scan();
        assert!(state.is_scanning());

        state.finish_scan();

        assert!(!state.is_scanning());
        assert!(state.current_scan_id().is_none());
        assert!(!state.is_cancel_requested());
    }

    #[test]
    fn test_request_cancel() {
        let state = AppState::new();

        // Can't cancel if not scanning
        assert!(!state.request_cancel());

        state.try_start_scan();

        // Now can cancel
        assert!(state.request_cancel());
        assert!(state.is_cancel_requested());
    }

    #[test]
    fn test_cancel_cleared_after_finish() {
        let state = AppState::new();

        state.try_start_scan();
        state.request_cancel();
        assert!(state.is_cancel_requested());

        state.finish_scan();

        assert!(!state.is_cancel_requested());
    }

    #[test]
    fn test_reset() {
        let state = AppState::new();

        state.try_start_scan();
        state.request_cancel();

        state.reset();

        assert!(!state.is_scanning());
        assert!(!state.is_cancel_requested());
        assert!(state.current_scan_id().is_none());
    }

    #[test]
    fn test_scan_id_unique() {
        let state = AppState::new();

        let id1 = state.try_start_scan().unwrap();
        state.finish_scan();

        // Small delay to ensure different timestamp
        std::thread::sleep(std::time::Duration::from_millis(2));

        let id2 = state.try_start_scan().unwrap();

        assert_ne!(id1, id2);
    }

    #[test]
    fn test_thread_safety() {
        let state = Arc::new(AppState::new());

        // Start a scan
        state.try_start_scan();

        // Spawn multiple threads that check and modify state
        let mut handles = vec![];

        for _ in 0..10 {
            let state_clone = Arc::clone(&state);
            handles.push(thread::spawn(move || {
                // These operations should be safe from any thread
                let _ = state_clone.is_scanning();
                let _ = state_clone.is_cancel_requested();
                let _ = state_clone.current_scan_id();
            }));
        }

        // Try to cancel from multiple threads
        for _ in 0..5 {
            let state_clone = Arc::clone(&state);
            handles.push(thread::spawn(move || {
                state_clone.request_cancel();
            }));
        }

        for handle in handles {
            handle.join().unwrap();
        }

        // State should be consistent
        assert!(state.is_scanning());
        assert!(state.is_cancel_requested());
    }

    #[test]
    fn test_default_trait() {
        let state = AppState::default();

        assert!(!state.is_scanning());
        assert!(!state.is_cancel_requested());
    }
}
