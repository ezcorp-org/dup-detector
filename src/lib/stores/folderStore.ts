/**
 * State management for selected folders and scan options.
 */

import { writable, derived } from 'svelte/store';
import type { ScanOptions } from '../types';

/** State for folder selection and options. */
interface FolderState {
  /** Selected folder paths. */
  folders: string[];

  /** Minimum file size in bytes. */
  minFileSize: number | null;

  /** Size unit for display. */
  sizeUnit: 'KB' | 'MB';

  /** Extensions to include (comma-separated input). */
  includeExtensions: string;

  /** Extensions to exclude (comma-separated input). */
  excludeExtensions: string;

  /** Whether to use include (true) or exclude (false) mode. */
  useIncludeMode: boolean;

  /** Whether to follow symbolic links. */
  followSymlinks: boolean;
}

/** Initial state. */
const initialState: FolderState = {
  folders: [],
  minFileSize: null,
  sizeUnit: 'KB',
  includeExtensions: '',
  excludeExtensions: '',
  useIncludeMode: true,
  followSymlinks: false,
};

/** Create the folder store. */
function createFolderStore() {
  const { subscribe, set, update } = writable<FolderState>(initialState);

  return {
    subscribe,

    /** Resets the store to initial state. */
    reset: () => set(initialState),

    /** Adds a folder to the list. */
    addFolder: (path: string) =>
      update((state) => {
        if (!state.folders.includes(path)) {
          return { ...state, folders: [...state.folders, path] };
        }
        return state;
      }),

    /** Adds multiple folders. */
    addFolders: (paths: string[]) =>
      update((state) => {
        const newFolders = paths.filter((p) => !state.folders.includes(p));
        if (newFolders.length > 0) {
          return { ...state, folders: [...state.folders, ...newFolders] };
        }
        return state;
      }),

    /** Removes a folder from the list. */
    removeFolder: (path: string) =>
      update((state) => ({
        ...state,
        folders: state.folders.filter((f) => f !== path),
      })),

    /** Clears all folders. */
    clearFolders: () =>
      update((state) => ({
        ...state,
        folders: [],
      })),

    /** Sets the minimum file size. */
    setMinFileSize: (size: number | null) =>
      update((state) => ({
        ...state,
        minFileSize: size,
      })),

    /** Sets the size unit. */
    setSizeUnit: (unit: 'KB' | 'MB') =>
      update((state) => ({
        ...state,
        sizeUnit: unit,
      })),

    /** Sets the include extensions string. */
    setIncludeExtensions: (value: string) =>
      update((state) => ({
        ...state,
        includeExtensions: value,
      })),

    /** Sets the exclude extensions string. */
    setExcludeExtensions: (value: string) =>
      update((state) => ({
        ...state,
        excludeExtensions: value,
      })),

    /** Toggles between include and exclude mode. */
    setUseIncludeMode: (value: boolean) =>
      update((state) => ({
        ...state,
        useIncludeMode: value,
      })),

    /** Sets whether to follow symlinks. */
    setFollowSymlinks: (value: boolean) =>
      update((state) => ({
        ...state,
        followSymlinks: value,
      })),
  };
}

/** The folder store singleton. */
export const folderStore = createFolderStore();

/** Whether any folders are selected. */
export const hasFolders = derived(
  folderStore,
  ($store) => $store.folders.length > 0
);

/** Number of selected folders. */
export const folderCount = derived(
  folderStore,
  ($store) => $store.folders.length
);

/**
 * Derives ScanOptions from the current folder state.
 */
export const scanOptions = derived(folderStore, ($store): ScanOptions => {
  // Parse extensions from comma-separated string
  const parseExtensions = (str: string): string[] | undefined => {
    const trimmed = str.trim();
    if (!trimmed) return undefined;
    return trimmed
      .split(',')
      .map((ext) => ext.trim().toLowerCase().replace(/^\./, ''))
      .filter((ext) => ext.length > 0);
  };

  // Calculate min size in bytes
  let minFileSize: number | undefined;
  if ($store.minFileSize !== null && $store.minFileSize > 0) {
    const multiplier = $store.sizeUnit === 'MB' ? 1024 * 1024 : 1024;
    minFileSize = $store.minFileSize * multiplier;
  }

  return {
    rootPaths: $store.folders,
    minFileSize,
    includeExtensions: $store.useIncludeMode
      ? parseExtensions($store.includeExtensions)
      : undefined,
    excludeExtensions: !$store.useIncludeMode
      ? parseExtensions($store.excludeExtensions)
      : undefined,
    followSymlinks: $store.followSymlinks,
  };
});
