# Duplicate File Detector - Development Tasks

## Overview
This document contains the complete task breakdown for implementing the Duplicate File Detector Tauri application. Tasks are organized into epics and should be completed in sequential order (with some parallelization possible where noted).

---

## Epic 1: Project Setup & Infrastructure

### Task 1.1: Initialize Tauri Project Structure
**Priority:** Critical | **Estimate:** Small

**Description:**
Set up the foundational Tauri + Svelte project structure with proper configuration.

**Acceptance Criteria:**
- [ ] Initialize Tauri project with `npm create tauri-app`
- [ ] Configure for Svelte (not SvelteKit)
- [ ] Verify `src-tauri/` directory structure exists
- [ ] Verify `src/` directory for Svelte frontend exists
- [ ] Configure `tauri.conf.json` with app metadata:
  - App name: "Duplicate File Detector"
  - Bundle identifier configured
  - Window size set to reasonable defaults (1200x800)
- [ ] Add `.gitignore` with proper exclusions for Rust, Node, and Tauri
- [ ] Verify `npm run tauri dev` launches successfully with empty app

**Technical Notes:**
- Use Tauri v2 (latest stable)
- Svelte 4.x recommended
- Ensure cross-platform compatibility from the start

---

### Task 1.2: Configure Rust Dependencies
**Priority:** Critical | **Estimate:** Small

**Description:**
Set up all required Rust crates in `Cargo.toml` for the backend functionality.

**Acceptance Criteria:**
- [ ] Add to `Cargo.toml`:
  ```toml
  [dependencies]
  walkdir = "2.4"           # Directory traversal
  md-5 = "0.10"             # MD5 hashing
  rayon = "1.8"             # Parallel processing
  serde = { version = "1.0", features = ["derive"] }
  serde_json = "1.0"
  trash = "3.0"             # Cross-platform trash/recycle bin
  log = "0.4"               # Logging facade
  env_logger = "0.10"       # Logging implementation
  thiserror = "1.0"         # Error handling
  parking_lot = "0.12"      # Better mutex/rwlock

  [dev-dependencies]
  tempfile = "3.8"          # For testing
  criterion = "0.5"         # Benchmarking
  ```
- [ ] Verify all dependencies compile with `cargo build`
- [ ] Add benchmark configuration to `Cargo.toml`

---

### Task 1.3: Configure Frontend Dependencies
**Priority:** Critical | **Estimate:** Small

**Description:**
Set up all required npm packages for the Svelte frontend.

**Acceptance Criteria:**
- [ ] Add to `package.json`:
  ```json
  {
    "dependencies": {
      "@tauri-apps/api": "^2.0.0"
    },
    "devDependencies": {
      "@testing-library/svelte": "^4.0.0",
      "vitest": "^1.0.0",
      "@playwright/test": "^1.40.0",
      "svelte-check": "^3.0.0"
    }
  }
  ```
- [ ] Configure Vitest for unit testing in `vite.config.ts`
- [ ] Configure Playwright for E2E testing
- [ ] Add npm scripts for test:unit, test:e2e, test:coverage
- [ ] Verify `npm run dev` works

---

### Task 1.4: Set Up Project Documentation
**Priority:** High | **Estimate:** Small

**Description:**
Create comprehensive README and developer documentation.

**Acceptance Criteria:**
- [ ] Create `README.md` with:
  - Project description
  - Prerequisites (Rust, Node.js, platform-specific deps)
  - Installation instructions
  - Development commands (`npm run tauri dev`)
  - Build commands (`npm run tauri build`)
  - Testing commands
  - Architecture overview
- [ ] Create `CONTRIBUTING.md` with code style guidelines
- [ ] Document the project structure in README

---

## Epic 2: Rust Backend - Core Types & Architecture

### Task 2.1: Define Core Data Types
**Priority:** Critical | **Estimate:** Small

**Description:**
Create strongly-typed Rust structs for all data exchanged between backend and frontend.

**Acceptance Criteria:**
- [ ] Create `src-tauri/src/types.rs` with:
  ```rust
  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct ScanOptions {
      pub root_paths: Vec<String>,
      pub min_file_size: Option<u64>,        // bytes
      pub include_extensions: Option<Vec<String>>,
      pub exclude_extensions: Option<Vec<String>>,
      pub follow_symlinks: bool,              // default: false
  }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct FileEntry {
      pub path: String,
      pub size: u64,
      pub modified: Option<String>,  // ISO 8601 format
  }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct DuplicateGroup {
      pub hash: String,
      pub size: u64,
      pub files: Vec<FileEntry>,
  }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct ScanProgress {
      pub files_scanned: u64,
      pub files_total: Option<u64>,
      pub current_phase: String,  // "counting", "hashing", "grouping"
  }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct ScanResult {
      pub duplicate_groups: Vec<DuplicateGroup>,
      pub total_files_scanned: u64,
      pub total_duplicates_found: u64,
      pub total_wasted_space: u64,  // bytes
      pub errors: Vec<ScanError>,
  }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct ScanError {
      pub path: String,
      pub message: String,
  }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct DeleteResult {
      pub deleted: Vec<String>,
      pub failed: Vec<DeleteError>,
  }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct DeleteError {
      pub path: String,
      pub reason: String,
  }
  ```
- [ ] Add `#[serde(rename_all = "camelCase")]` for JS-friendly naming
- [ ] Write unit tests for serialization/deserialization
- [ ] 100% test coverage for types module

---

### Task 2.2: Create Error Handling Infrastructure
**Priority:** Critical | **Estimate:** Small

**Description:**
Implement robust error handling using `thiserror` for the Rust backend.

**Acceptance Criteria:**
- [ ] Create `src-tauri/src/error.rs`:
  ```rust
  use thiserror::Error;

  #[derive(Error, Debug)]
  pub enum ScannerError {
      #[error("IO error: {0}")]
      Io(#[from] std::io::Error),

      #[error("Path not found: {0}")]
      PathNotFound(String),

      #[error("Permission denied: {0}")]
      PermissionDenied(String),

      #[error("Scan cancelled")]
      Cancelled,

      #[error("Invalid path: {0}")]
      InvalidPath(String),
  }
  ```
- [ ] Implement `From<ScannerError>` for `tauri::Error` or use `impl IntoResponse`
- [ ] Ensure errors serialize properly for frontend consumption
- [ ] Write unit tests for all error types

---

### Task 2.3: Set Up Module Structure
**Priority:** Critical | **Estimate:** Small

**Description:**
Create the modular Rust architecture with clear separation of concerns.

**Acceptance Criteria:**
- [ ] Create directory structure:
  ```
  src-tauri/src/
  ├── main.rs           # Tauri entry point
  ├── lib.rs            # Library root (for testing)
  ├── types.rs          # Data types
  ├── error.rs          # Error types
  ├── commands.rs       # Tauri command handlers
  ├── scanner/
  │   ├── mod.rs        # Scanner module
  │   └── filter.rs     # File filtering logic
  ├── hasher/
  │   └── mod.rs        # MD5 hashing module
  ├── duplicates/
  │   └── mod.rs        # Duplicate grouping logic
  └── state.rs          # App state management
  ```
- [ ] Set up proper module exports in each `mod.rs`
- [ ] Configure `lib.rs` for unit testing

---

## Epic 3: Rust Backend - Scanner Module

### Task 3.1: Implement Directory Scanner
**Priority:** Critical | **Estimate:** Medium

**Description:**
Create the core directory scanning functionality using `walkdir`.

**Acceptance Criteria:**
- [ ] Create `src-tauri/src/scanner/mod.rs`:
  - Implement `scan_directories(paths: &[PathBuf], options: &ScanOptions) -> Result<Vec<FileEntry>>`
  - Use `walkdir` for recursive traversal
  - Respect `follow_symlinks` option
  - Handle permission errors gracefully (log and continue)
  - Skip directories that can't be read
  - Collect errors into a separate error list
- [ ] Implement symlink loop detection
- [ ] Handle very long paths (> 260 chars on Windows)
- [ ] Handle files that disappear during scan
- [ ] Write unit tests with `tempfile`:
  - Test basic directory scanning
  - Test nested directories
  - Test with symlinks
  - Test with permission-denied directories
  - Test with empty directories
- [ ] 100% test coverage

**Technical Notes:**
- Use `walkdir::WalkDir::new(path).follow_links(options.follow_symlinks)`
- Collect `DirEntry` metadata in single pass for efficiency

---

### Task 3.2: Implement File Filtering
**Priority:** Critical | **Estimate:** Small

**Description:**
Create filtering logic for file size and extensions.

**Acceptance Criteria:**
- [ ] Create `src-tauri/src/scanner/filter.rs`:
  ```rust
  pub struct FileFilter {
      min_size: Option<u64>,
      include_extensions: Option<HashSet<String>>,
      exclude_extensions: Option<HashSet<String>>,
  }

  impl FileFilter {
      pub fn matches(&self, entry: &DirEntry) -> bool
  }
  ```
- [ ] Implement case-insensitive extension matching
- [ ] Handle files without extensions
- [ ] Apply filters during scan (not post-scan) for efficiency
- [ ] Write unit tests:
  - Test min size filter
  - Test extension inclusion
  - Test extension exclusion
  - Test combined filters
  - Test case insensitivity
- [ ] 100% test coverage

---

### Task 3.3: Implement Size-Based Grouping
**Priority:** Critical | **Estimate:** Small

**Description:**
Group files by size as the first step of duplicate detection (optimization).

**Acceptance Criteria:**
- [ ] Implement `group_by_size(files: Vec<FileEntry>) -> HashMap<u64, Vec<FileEntry>>`
- [ ] Filter out groups with only 1 file (unique by size = unique)
- [ ] This optimization avoids hashing files that can't possibly be duplicates
- [ ] Write unit tests:
  - Test grouping logic
  - Test single-file groups are excluded
  - Test empty input
  - Test all unique sizes
- [ ] 100% test coverage

---

## Epic 4: Rust Backend - Hasher Module

### Task 4.1: Implement Buffered MD5 Hashing
**Priority:** Critical | **Estimate:** Medium

**Description:**
Create efficient MD5 hashing that doesn't load entire files into memory.

**Acceptance Criteria:**
- [ ] Create `src-tauri/src/hasher/mod.rs`:
  ```rust
  const BUFFER_SIZE: usize = 64 * 1024;  // 64KB buffer

  pub fn hash_file(path: &Path) -> Result<String, ScannerError>
  ```
- [ ] Use buffered reading (64KB chunks)
- [ ] Return lowercase hex string
- [ ] Handle files being deleted during hashing
- [ ] Handle permission errors
- [ ] Handle locked files (Windows)
- [ ] Write unit tests:
  - Test small files
  - Test large files (> 1GB mock)
  - Test empty files
  - Test file read errors
- [ ] 100% test coverage

---

### Task 4.2: Implement Parallel Hashing with Rayon
**Priority:** Critical | **Estimate:** Medium

**Description:**
Use Rayon for parallel hashing to maximize CPU utilization.

**Acceptance Criteria:**
- [ ] Implement parallel hashing:
  ```rust
  pub fn hash_files_parallel(
      files: Vec<FileEntry>,
      progress_callback: impl Fn(u64) + Send + Sync,
  ) -> Vec<(FileEntry, Result<String, ScannerError>)>
  ```
- [ ] Use `rayon::par_iter()` for parallel processing
- [ ] Configure thread pool size (use `rayon::ThreadPoolBuilder` or defaults)
- [ ] Implement progress callback for UI updates
- [ ] Handle partial failures (some files may fail)
- [ ] Write unit tests:
  - Test parallel hashing produces same results as sequential
  - Test progress callback is called
  - Test with mixed success/failure files
- [ ] 100% test coverage

**Technical Notes:**
- Consider limiting parallelism for very large files (I/O bound, not CPU bound)
- Progress updates should be batched to avoid UI flooding

---

## Epic 5: Rust Backend - Duplicates Module

### Task 5.1: Implement Duplicate Grouping
**Priority:** Critical | **Estimate:** Small

**Description:**
Group files by their MD5 hash to identify duplicates.

**Acceptance Criteria:**
- [ ] Create `src-tauri/src/duplicates/mod.rs`:
  ```rust
  pub fn find_duplicates(
      files_with_hashes: Vec<(FileEntry, String)>
  ) -> Vec<DuplicateGroup>
  ```
- [ ] Group by hash
- [ ] Exclude groups with only 1 file
- [ ] Sort groups by total wasted space (descending)
- [ ] Calculate wasted space per group: `(count - 1) * size`
- [ ] Write unit tests:
  - Test basic grouping
  - Test no duplicates case
  - Test all duplicates case
  - Test sorting by wasted space
- [ ] 100% test coverage

---

### Task 5.2: Implement Full Scan Pipeline
**Priority:** Critical | **Estimate:** Medium

**Description:**
Orchestrate the complete scan pipeline: scan -> filter -> group by size -> hash -> group by hash.

**Acceptance Criteria:**
- [ ] Create orchestration function:
  ```rust
  pub async fn run_scan(
      options: ScanOptions,
      progress_tx: Sender<ScanProgress>,
      cancel_token: CancellationToken,
  ) -> Result<ScanResult, ScannerError>
  ```
- [ ] Implement phases:
  1. "counting" - Initial directory scan
  2. "grouping" - Group by file size
  3. "hashing" - Hash files in size groups
  4. "complete" - Final duplicate grouping
- [ ] Emit progress events for each phase
- [ ] Support cancellation between phases and during hashing
- [ ] Collect all non-fatal errors into result
- [ ] Write integration tests for full pipeline
- [ ] 100% test coverage

---

## Epic 6: Rust Backend - Tauri Commands & State

### Task 6.1: Implement App State Management
**Priority:** Critical | **Estimate:** Small

**Description:**
Create thread-safe state management for scan status and cancellation.

**Acceptance Criteria:**
- [ ] Create `src-tauri/src/state.rs`:
  ```rust
  use parking_lot::RwLock;
  use std::sync::atomic::{AtomicBool, Ordering};

  pub struct AppState {
      pub is_scanning: AtomicBool,
      pub cancel_requested: AtomicBool,
      pub current_scan_id: RwLock<Option<String>>,
  }
  ```
- [ ] Implement state initialization in Tauri setup
- [ ] Use `tauri::State<AppState>` in commands
- [ ] Write unit tests for state transitions

---

### Task 6.2: Implement Tauri Commands
**Priority:** Critical | **Estimate:** Medium

**Description:**
Create all Tauri command handlers that the frontend will invoke.

**Acceptance Criteria:**
- [ ] Create `src-tauri/src/commands.rs`:
  ```rust
  #[tauri::command]
  pub async fn start_scan(
      options: ScanOptions,
      app_handle: tauri::AppHandle,
      state: tauri::State<'_, AppState>,
  ) -> Result<ScanResult, String>

  #[tauri::command]
  pub fn cancel_scan(
      state: tauri::State<'_, AppState>,
  ) -> Result<(), String>

  #[tauri::command]
  pub async fn delete_files(
      file_paths: Vec<String>,
      use_trash: bool,
  ) -> Result<DeleteResult, String>

  #[tauri::command]
  pub async fn select_folders() -> Result<Vec<String>, String>
  ```
- [ ] `start_scan`:
  - Validate options
  - Set `is_scanning` state
  - Spawn async task for scanning
  - Emit progress events via `app_handle.emit()`
  - Reset state on completion/error
- [ ] `cancel_scan`:
  - Set `cancel_requested` flag
  - Return immediately (cancellation is async)
- [ ] `delete_files`:
  - Use `trash::delete()` when `use_trash = true`
  - Use `std::fs::remove_file()` when `use_trash = false`
  - Collect successes and failures
  - Return detailed result
- [ ] `select_folders`:
  - Use Tauri's native dialog API
- [ ] Write unit tests for each command
- [ ] 100% test coverage

---

### Task 6.3: Implement Event Emission
**Priority:** Critical | **Estimate:** Small

**Description:**
Set up Tauri event emission for real-time progress updates.

**Acceptance Criteria:**
- [ ] Define event types:
  - `scan_progress` - Emitted periodically with `ScanProgress`
  - `scan_finished` - Emitted when scan completes with `ScanResult`
  - `scan_error` - Emitted on fatal error with error message
  - `scan_cancelled` - Emitted when scan is cancelled
- [ ] Implement rate-limited progress emission (max 10 updates/second)
- [ ] Use `app_handle.emit("event_name", payload)` syntax
- [ ] Write tests verifying events are emitted correctly

---

### Task 6.4: Wire Up Main Entry Point
**Priority:** Critical | **Estimate:** Small

**Description:**
Configure `main.rs` to register commands and initialize state.

**Acceptance Criteria:**
- [ ] Update `src-tauri/src/main.rs`:
  ```rust
  fn main() {
      tauri::Builder::default()
          .manage(AppState::default())
          .invoke_handler(tauri::generate_handler![
              commands::start_scan,
              commands::cancel_scan,
              commands::delete_files,
              commands::select_folders,
          ])
          .setup(|app| {
              // Initialize logging
              env_logger::init();
              Ok(())
          })
          .run(tauri::generate_context!())
          .expect("error while running tauri application");
  }
  ```
- [ ] Configure logging with environment variable toggle (`RUST_LOG`)
- [ ] Verify all commands are accessible from frontend

---

## Epic 7: Svelte Frontend - Core Setup

### Task 7.1: Create Svelte Store Architecture
**Priority:** Critical | **Estimate:** Small

**Description:**
Set up centralized state management using Svelte stores.

**Acceptance Criteria:**
- [ ] Create `src/lib/stores/scanStore.ts`:
  ```typescript
  import { writable, derived } from 'svelte/store';

  export type ScanStatus = 'idle' | 'scanning' | 'finished' | 'cancelled' | 'error';

  interface ScanState {
      status: ScanStatus;
      progress: {
          filesScanned: number;
          filesTotal: number | null;
          currentPhase: string;
      };
      duplicateGroups: DuplicateGroup[];
      errors: ScanError[];
      selectedForDeletion: Set<string>;
  }

  export const scanState = writable<ScanState>({...});

  export const totalWastedSpace = derived(scanState, $state => ...);
  export const selectedFilesCount = derived(scanState, $state => ...);
  ```
- [ ] Create TypeScript interfaces matching Rust types
- [ ] Create derived stores for computed values
- [ ] Write unit tests for store logic
- [ ] 100% test coverage

---

### Task 7.2: Create Tauri API Wrapper
**Priority:** Critical | **Estimate:** Small

**Description:**
Create a typed wrapper around Tauri's invoke and event APIs.

**Acceptance Criteria:**
- [ ] Create `src/lib/api/tauri.ts`:
  ```typescript
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';

  export async function startScan(options: ScanOptions): Promise<ScanResult> {
      return invoke('start_scan', { options });
  }

  export async function cancelScan(): Promise<void> {
      return invoke('cancel_scan');
  }

  export async function deleteFiles(
      filePaths: string[],
      useTrash: boolean
  ): Promise<DeleteResult> {
      return invoke('delete_files', { filePaths, useTrash });
  }

  export async function selectFolders(): Promise<string[]> {
      return invoke('select_folders');
  }

  export function onScanProgress(
      callback: (progress: ScanProgress) => void
  ): Promise<() => void> {
      return listen('scan_progress', (event) => callback(event.payload));
  }
  // ... similar for other events
  ```
- [ ] Full TypeScript typing for all functions
- [ ] Write unit tests with mocked Tauri API
- [ ] 100% test coverage

---

### Task 7.3: Create Base App Layout
**Priority:** Critical | **Estimate:** Small

**Description:**
Set up the main App.svelte component with layout structure.

**Acceptance Criteria:**
- [ ] Create `src/App.svelte`:
  - Header with app title
  - Main content area
  - Footer with status
- [ ] Set up CSS variables for theming
- [ ] Create basic responsive layout
- [ ] Import and render child components (placeholders initially)
- [ ] Write component test
- [ ] 100% test coverage

---

## Epic 8: Svelte Frontend - Components

### Task 8.1: Implement FolderSelector Component
**Priority:** Critical | **Estimate:** Small

**Description:**
Create the folder selection UI with multi-folder support.

**Acceptance Criteria:**
- [ ] Create `src/lib/components/FolderSelector.svelte`:
  - "Add Folder" button that invokes `selectFolders`
  - Display list of selected folders
  - "Remove" button for each folder
  - Empty state message when no folders selected
- [ ] Handle errors from folder dialog
- [ ] Write component tests:
  - Test adding folder
  - Test removing folder
  - Test empty state
- [ ] 100% test coverage

---

### Task 8.2: Implement ScanControls Component
**Priority:** Critical | **Estimate:** Small

**Description:**
Create filter controls and scan start/stop buttons.

**Acceptance Criteria:**
- [ ] Create `src/lib/components/ScanControls.svelte`:
  - Minimum file size input (number input with KB/MB selector)
  - Extension filter input (comma-separated, e.g., "jpg,png,gif")
  - Toggle for include/exclude mode
  - "Follow symlinks" checkbox (default: unchecked)
  - "Start Scan" button (disabled when scanning or no folders)
  - "Cancel Scan" button (visible only when scanning)
- [ ] Validate inputs before scan
- [ ] Dispatch `startScan` and `cancelScan` events
- [ ] Write component tests for all controls
- [ ] 100% test coverage

---

### Task 8.3: Implement ProgressBar Component
**Priority:** Critical | **Estimate:** Small

**Description:**
Create progress display for ongoing scans.

**Acceptance Criteria:**
- [ ] Create `src/lib/components/ProgressBar.svelte`:
  - Visual progress bar (indeterminate when total unknown)
  - Text: "Scanning files... X / Y" or "Scanning files... X"
  - Current phase display
  - Animate smoothly
- [ ] Subscribe to scan progress store
- [ ] Hide when not scanning
- [ ] Write component tests
- [ ] 100% test coverage

---

### Task 8.4: Implement DuplicateGroups Component
**Priority:** Critical | **Estimate:** Medium

**Description:**
Create the main duplicate groups display with expand/collapse and selection.

**Acceptance Criteria:**
- [ ] Create `src/lib/components/DuplicateGroups.svelte`:
  - List/table of duplicate groups
  - Each group row shows:
    - Hash (truncated to 8 chars)
    - File size (human-readable: KB, MB, GB)
    - Number of duplicates
    - Wasted space
    - Expand/collapse arrow
  - Expanded group shows:
    - All file paths in the group
    - Checkbox for each file
    - "Select all but one" button per group
  - Summary header: "X duplicate groups found, Y files, Z wasted"
- [ ] Handle empty state (no duplicates found)
- [ ] Implement virtual scrolling for large lists (100+ groups)
- [ ] Write component tests:
  - Test rendering groups
  - Test expand/collapse
  - Test file selection
  - Test "select all but one"
- [ ] 100% test coverage

---

### Task 8.5: Implement DeleteControls Component
**Priority:** Critical | **Estimate:** Small

**Description:**
Create deletion controls with confirmation dialogs.

**Acceptance Criteria:**
- [ ] Create `src/lib/components/DeleteControls.svelte`:
  - "Delete Selected" button (disabled when nothing selected)
  - Badge showing selected count and size
  - "Move to Trash" toggle (default: on)
  - Clear warning when trash is disabled
- [ ] Create `src/lib/components/ConfirmDialog.svelte`:
  - Modal overlay
  - Warning message
  - List of files to be deleted (scrollable if many)
  - "Cancel" and "Delete" buttons
  - Extra prominent warning if not using trash
- [ ] Handle deletion results:
  - Show success count
  - Show failures with reasons
- [ ] Write component tests
- [ ] 100% test coverage

---

### Task 8.6: Implement ErrorPanel Component
**Priority:** High | **Estimate:** Small

**Description:**
Create a panel to display non-fatal scan errors.

**Acceptance Criteria:**
- [ ] Create `src/lib/components/ErrorPanel.svelte`:
  - Collapsible panel
  - Header: "X problems encountered"
  - List of errors with path and message
  - "Dismiss" button to hide
- [ ] Only show when errors exist
- [ ] Write component tests
- [ ] 100% test coverage

---

## Epic 9: Frontend-Backend Integration

### Task 9.1: Wire Up Event Listeners
**Priority:** Critical | **Estimate:** Small

**Description:**
Connect Tauri events to Svelte stores for real-time updates.

**Acceptance Criteria:**
- [ ] In App.svelte `onMount`:
  ```typescript
  import { onMount, onDestroy } from 'svelte';
  import { onScanProgress, onScanFinished, onScanError } from '$lib/api/tauri';

  let unlisteners: (() => void)[] = [];

  onMount(async () => {
      unlisteners.push(await onScanProgress(handleProgress));
      unlisteners.push(await onScanFinished(handleFinished));
      // ...
  });

  onDestroy(() => {
      unlisteners.forEach(fn => fn());
  });
  ```
- [ ] Update stores on each event
- [ ] Handle edge cases (events arriving after cancel)
- [ ] Write integration tests
- [ ] 100% test coverage

---

### Task 9.2: Implement Full Scan Flow
**Priority:** Critical | **Estimate:** Medium

**Description:**
Integrate all components to provide complete scan functionality.

**Acceptance Criteria:**
- [ ] User flow:
  1. Select folders -> folders appear in list
  2. Configure filters (optional)
  3. Click "Start Scan" -> progress appears, button changes to "Cancel"
  4. Progress updates in real-time
  5. On completion -> duplicate groups appear
  6. Errors (if any) appear in error panel
- [ ] Handle cancellation at any point
- [ ] Handle scan errors gracefully
- [ ] Handle empty results (no duplicates found)
- [ ] Write E2E test for complete flow
- [ ] 100% test coverage

---

### Task 9.3: Implement Deletion Flow
**Priority:** Critical | **Estimate:** Medium

**Description:**
Integrate deletion functionality with confirmation and feedback.

**Acceptance Criteria:**
- [ ] User flow:
  1. Select files via checkboxes or "Select all but one"
  2. Click "Delete Selected"
  3. Confirmation dialog appears with file list
  4. User confirms
  5. Deletion executes
  6. Results displayed (successes and failures)
  7. Deleted files removed from UI
- [ ] Handle partial failures
- [ ] Prevent interaction during deletion
- [ ] Write E2E test for deletion flow
- [ ] 100% test coverage

---

## Epic 10: Testing & Quality Assurance

### Task 10.1: Rust Unit Test Suite
**Priority:** Critical | **Estimate:** Medium

**Description:**
Complete unit test coverage for all Rust modules.

**Acceptance Criteria:**
- [ ] All modules have comprehensive unit tests
- [ ] Tests use `tempfile` for filesystem tests
- [ ] Tests cover:
  - Happy paths
  - Error cases
  - Edge cases (empty inputs, large files, special characters in paths)
- [ ] Run with `cargo test`
- [ ] 100% line coverage verified with `cargo tarpaulin`

---

### Task 10.2: Svelte Unit Test Suite
**Priority:** Critical | **Estimate:** Medium

**Description:**
Complete unit test coverage for all Svelte components.

**Acceptance Criteria:**
- [ ] All components have unit tests with `@testing-library/svelte`
- [ ] All stores have unit tests
- [ ] Mock Tauri API for isolated testing
- [ ] Tests cover:
  - Rendering
  - User interactions
  - State changes
  - Error handling
- [ ] Run with `npm run test:unit`
- [ ] 100% coverage verified with Vitest coverage

---

### Task 10.3: E2E Test Suite
**Priority:** Critical | **Estimate:** Medium

**Description:**
Create comprehensive E2E tests with Playwright + Tauri.

**Acceptance Criteria:**
- [ ] Configure Playwright for Tauri testing
- [ ] E2E tests:
  - Complete scan flow with test directory
  - Cancellation during scan
  - Deletion flow with trash
  - Deletion flow without trash
  - Error handling (permission denied, etc.)
  - Large scan (1000+ files)
- [ ] Tests run against built app
- [ ] CI configuration for E2E tests
- [ ] All tests passing

---

### Task 10.4: Rust Benchmarks
**Priority:** High | **Estimate:** Small

**Description:**
Create performance benchmarks for critical paths.

**Acceptance Criteria:**
- [ ] Create `benches/scan_benchmark.rs`:
  - Benchmark directory scanning
  - Benchmark MD5 hashing
  - Benchmark duplicate grouping
- [ ] Use Criterion for statistical significance
- [ ] Document baseline performance
- [ ] Add benchmark to CI (for tracking regressions)

---

## Epic 11: Performance Optimization

### Task 11.1: Optimize Directory Scanning
**Priority:** High | **Estimate:** Small

**Description:**
Ensure directory scanning is as fast as possible.

**Acceptance Criteria:**
- [ ] Profile scanning with large directories (100k+ files)
- [ ] Minimize allocations in hot path
- [ ] Use `walkdir` parallelism where appropriate
- [ ] Consider `jwalk` for parallel walking if needed
- [ ] Document performance characteristics

---

### Task 11.2: Optimize Hashing Pipeline
**Priority:** High | **Estimate:** Small

**Description:**
Ensure hashing is maximally parallel and efficient.

**Acceptance Criteria:**
- [ ] Profile hashing with large files (1GB+)
- [ ] Profile hashing with many small files
- [ ] Tune Rayon thread pool size
- [ ] Consider I/O-bound vs CPU-bound tuning
- [ ] Implement progressive hashing (hash first 4KB, then rest if match)
- [ ] Document performance characteristics

---

### Task 11.3: Optimize Frontend Rendering
**Priority:** High | **Estimate:** Small

**Description:**
Ensure UI stays responsive with large result sets.

**Acceptance Criteria:**
- [ ] Profile with 1000+ duplicate groups
- [ ] Implement virtual scrolling if not already done
- [ ] Minimize reactive updates during progress
- [ ] Batch store updates where appropriate
- [ ] Test with 100k files scanned

---

## Epic 12: Polish & Release Preparation

### Task 12.1: Add Logging
**Priority:** Medium | **Estimate:** Small

**Description:**
Implement comprehensive logging for debugging.

**Acceptance Criteria:**
- [ ] Use `log` crate in Rust
- [ ] Log levels: ERROR, WARN, INFO, DEBUG
- [ ] Log key operations:
  - Scan start/end
  - Files found
  - Hashing progress
  - Errors encountered
  - Deletions
- [ ] Enable via `RUST_LOG` environment variable
- [ ] Consider persisting logs to file (optional)

---

### Task 12.2: UI Polish
**Priority:** Medium | **Estimate:** Medium

**Description:**
Refine UI/UX for a polished user experience.

**Acceptance Criteria:**
- [ ] Consistent styling throughout
- [ ] Loading spinners where appropriate
- [ ] Hover states for interactive elements
- [ ] Keyboard navigation support
- [ ] Tooltips for complex features
- [ ] Responsive design (min width: 800px)
- [ ] Dark mode support (optional but nice)

---

### Task 12.3: Error UX Improvements
**Priority:** Medium | **Estimate:** Small

**Description:**
Improve error handling and messaging throughout.

**Acceptance Criteria:**
- [ ] User-friendly error messages (no raw paths or stack traces)
- [ ] Actionable error messages where possible
- [ ] Non-blocking errors for partial failures
- [ ] Clear feedback for all user actions

---

### Task 12.4: Cross-Platform Testing
**Priority:** Critical | **Estimate:** Medium

**Description:**
Verify application works on all target platforms.

**Acceptance Criteria:**
- [ ] Test on Windows 10/11
- [ ] Test on macOS (Intel and Apple Silicon if possible)
- [ ] Test on Linux (Ubuntu, Fedora)
- [ ] Fix platform-specific issues
- [ ] Document platform-specific behavior

---

### Task 12.5: Build & Distribution
**Priority:** Critical | **Estimate:** Small

**Description:**
Configure production builds and distribution.

**Acceptance Criteria:**
- [ ] Configure `tauri.conf.json` for production
- [ ] Set up signing (optional, platform-dependent)
- [ ] Build Windows installer (.msi or .exe)
- [ ] Build macOS app bundle (.dmg)
- [ ] Build Linux packages (.deb, .AppImage)
- [ ] Test installers on each platform
- [ ] Document build process in README

---

## Task Dependencies & Parallelization

### Critical Path (Must be Sequential):
1. Epic 1 (Setup) → Epic 2 (Core Types)
2. Epic 2 → Epic 3 (Scanner) + Epic 4 (Hasher) [parallel]
3. Epic 3 + Epic 4 → Epic 5 (Duplicates)
4. Epic 5 → Epic 6 (Tauri Commands)
5. Epic 1 → Epic 7 (Frontend Setup)
6. Epic 7 → Epic 8 (Components)
7. Epic 6 + Epic 8 → Epic 9 (Integration)
8. Epic 9 → Epic 10 (Testing)
9. Epic 10 → Epic 11 (Optimization) + Epic 12 (Polish) [parallel]

### Can Be Parallelized:
- Task 3.1-3.3 (Scanner) with Task 4.1-4.2 (Hasher)
- Task 8.1-8.6 (all frontend components)
- Task 10.1 (Rust tests) with Task 10.2 (Svelte tests)
- Task 11.1-11.3 (all optimization tasks)
- Task 12.1-12.4 (all polish tasks)

---

## Estimated Total Effort
- **Epic 1:** 4 tasks, ~1 day
- **Epic 2:** 3 tasks, ~0.5 day
- **Epic 3:** 3 tasks, ~1 day
- **Epic 4:** 2 tasks, ~1 day
- **Epic 5:** 2 tasks, ~0.5 day
- **Epic 6:** 4 tasks, ~1 day
- **Epic 7:** 3 tasks, ~0.5 day
- **Epic 8:** 6 tasks, ~2 days
- **Epic 9:** 3 tasks, ~1 day
- **Epic 10:** 4 tasks, ~2 days
- **Epic 11:** 3 tasks, ~1 day
- **Epic 12:** 5 tasks, ~2 days

**Total: ~13-15 days of focused development**

---

## Notes for Developer

1. **Start with a working skeleton** - Get the simplest possible scan working end-to-end before adding features.

2. **Test as you go** - Write tests alongside implementation, not after.

3. **Performance is a feature** - Profile early and often, especially with large directories.

4. **Cross-platform from day 1** - Test on at least 2 platforms regularly.

5. **Error handling is critical** - Users have messy filesystems. Handle everything gracefully.

6. **Keep the UI responsive** - Never block the main thread. Use async/events everywhere.
