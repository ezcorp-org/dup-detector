/**
 * Centralized state management for the duplicate scan functionality.
 */

import { writable, derived } from 'svelte/store';
import type {
  ScanStatus,
  ScanProgress,
  ScanResult,
  DuplicateGroup,
  ScanError,
} from '../types';

/** State for the scan store. */
interface ScanState {
  /** Current scan status. */
  status: ScanStatus;

  /** Progress information for ongoing scan. */
  progress: {
    filesScanned: number;
    filesTotal: number | null;
    currentPhase: string;
  };

  /** Results from completed scan. */
  duplicateGroups: DuplicateGroup[];

  /** Errors encountered during scan. */
  errors: ScanError[];

  /** Files selected for deletion. */
  selectedForDeletion: Set<string>;

  /** Scan duration in milliseconds. */
  durationMs: number;

  /** Total files scanned. */
  totalFilesScanned: number;

  /** Error message if status is 'error'. */
  errorMessage: string | null;
}

/** Initial state. */
const initialState: ScanState = {
  status: 'idle',
  progress: {
    filesScanned: 0,
    filesTotal: null,
    currentPhase: '',
  },
  duplicateGroups: [],
  errors: [],
  selectedForDeletion: new Set(),
  durationMs: 0,
  totalFilesScanned: 0,
  errorMessage: null,
};

/** Create the writable store. */
function createScanStore() {
  const { subscribe, set, update } = writable<ScanState>(initialState);

  return {
    subscribe,

    /** Resets the store to initial state. */
    reset: () => set({ ...initialState, selectedForDeletion: new Set() }),

    /** Sets the scan status. */
    setStatus: (status: ScanStatus) =>
      update((state) => ({ ...state, status })),

    /** Updates progress during scan. */
    updateProgress: (progress: ScanProgress) =>
      update((state) => ({
        ...state,
        progress: {
          filesScanned: progress.filesScanned,
          filesTotal: progress.filesTotal ?? null,
          currentPhase: progress.currentPhase,
        },
      })),

    /** Sets the scan as started. */
    startScan: () =>
      update((state) => ({
        ...state,
        status: 'scanning',
        duplicateGroups: [],
        errors: [],
        selectedForDeletion: new Set(),
        progress: {
          filesScanned: 0,
          filesTotal: null,
          currentPhase: 'counting',
        },
        errorMessage: null,
      })),

    /** Sets the scan as finished with results. */
    finishScan: (result: ScanResult) =>
      update((state) => ({
        ...state,
        status: 'finished',
        duplicateGroups: result.duplicateGroups,
        errors: result.errors,
        durationMs: result.durationMs,
        totalFilesScanned: result.totalFilesScanned,
        progress: {
          filesScanned: result.totalFilesScanned,
          filesTotal: result.totalFilesScanned,
          currentPhase: 'complete',
        },
      })),

    /** Sets the scan as cancelled. */
    cancelScan: () =>
      update((state) => ({
        ...state,
        status: 'cancelled',
        progress: {
          ...state.progress,
          currentPhase: 'cancelled',
        },
      })),

    /** Sets an error state. */
    setError: (message: string) =>
      update((state) => ({
        ...state,
        status: 'error',
        errorMessage: message,
      })),

    /** Toggles file selection for deletion. */
    toggleFileSelection: (path: string) =>
      update((state) => {
        const newSet = new Set(state.selectedForDeletion);
        if (newSet.has(path)) {
          newSet.delete(path);
        } else {
          newSet.add(path);
        }
        return { ...state, selectedForDeletion: newSet };
      }),

    /** Selects all files in a group except one. */
    selectAllButOne: (group: DuplicateGroup) =>
      update((state) => {
        const newSet = new Set(state.selectedForDeletion);
        // Add all files except the first one
        group.files.slice(1).forEach((file) => newSet.add(file.path));
        return { ...state, selectedForDeletion: newSet };
      }),

    /** Clears selection for a specific group. */
    clearGroupSelection: (group: DuplicateGroup) =>
      update((state) => {
        const newSet = new Set(state.selectedForDeletion);
        group.files.forEach((file) => newSet.delete(file.path));
        return { ...state, selectedForDeletion: newSet };
      }),

    /** Clears all selections. */
    clearAllSelections: () =>
      update((state) => ({
        ...state,
        selectedForDeletion: new Set(),
      })),

    /** Selects all duplicates (all but one from each group) across all groups. */
    selectAllDuplicates: () =>
      update((state) => {
        const newSet = new Set(state.selectedForDeletion);
        // For each group, select all files except the first one
        state.duplicateGroups.forEach((group) => {
          group.files.slice(1).forEach((file) => newSet.add(file.path));
        });
        return { ...state, selectedForDeletion: newSet };
      }),

    /** Removes deleted files from the duplicate groups. */
    removeDeletedFiles: (deletedPaths: string[]) =>
      update((state) => {
        const deletedSet = new Set(deletedPaths);

        // Remove deleted files from groups
        const updatedGroups = state.duplicateGroups
          .map((group) => ({
            ...group,
            files: group.files.filter((f) => !deletedSet.has(f.path)),
          }))
          // Remove groups with less than 2 files
          .filter((group) => group.files.length >= 2);

        // Remove deleted files from selection
        const newSelection = new Set(state.selectedForDeletion);
        deletedPaths.forEach((path) => newSelection.delete(path));

        return {
          ...state,
          duplicateGroups: updatedGroups,
          selectedForDeletion: newSelection,
        };
      }),

    /** Dismisses errors. */
    dismissErrors: () =>
      update((state) => ({
        ...state,
        errors: [],
      })),
  };
}

/** The scan store singleton. */
export const scanStore = createScanStore();

// Expose store to window for e2e testing
if (typeof window !== 'undefined') {
  (window as any).__scanStore = scanStore;
}

// Derived stores for computed values

/** Total wasted space across all duplicate groups. */
export const totalWastedSpace = derived(scanStore, ($store) =>
  $store.duplicateGroups.reduce((sum, group) => {
    const wasted = (group.files.length - 1) * group.size;
    return sum + wasted;
  }, 0)
);

/** Number of selected files. */
export const selectedFilesCount = derived(
  scanStore,
  ($store) => $store.selectedForDeletion.size
);

/** Total size of selected files. */
export const selectedFilesSize = derived(scanStore, ($store) => {
  let total = 0;
  for (const group of $store.duplicateGroups) {
    for (const file of group.files) {
      if ($store.selectedForDeletion.has(file.path)) {
        total += file.size;
      }
    }
  }
  return total;
});

/** Whether any files are selected. */
export const hasSelection = derived(
  scanStore,
  ($store) => $store.selectedForDeletion.size > 0
);

/** Number of duplicate groups. */
export const groupCount = derived(
  scanStore,
  ($store) => $store.duplicateGroups.length
);

/** Total number of duplicate files. */
export const totalDuplicateFiles = derived(scanStore, ($store) =>
  $store.duplicateGroups.reduce((sum, group) => sum + group.files.length, 0)
);

/** Whether a scan is currently running. */
export const isScanning = derived(
  scanStore,
  ($store) => $store.status === 'scanning'
);

/** Whether results are available. */
export const hasResults = derived(
  scanStore,
  ($store) => $store.status === 'finished' && $store.duplicateGroups.length > 0
);

/** Whether there are errors to display. */
export const hasErrors = derived(
  scanStore,
  ($store) => $store.errors.length > 0
);
