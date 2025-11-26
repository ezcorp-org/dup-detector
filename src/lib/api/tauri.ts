/**
 * Type-safe wrapper around Tauri's invoke and event APIs.
 * Falls back to mock implementation when not running in Tauri.
 */

import type {
  ScanOptions,
  ScanResult,
  ScanProgress,
  DeleteResult,
} from '../types';

// Check if we're running in Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

type UnlistenFn = () => void;

// Event names matching the Rust backend
const EVENTS = {
  SCAN_PROGRESS: 'scan_progress',
  SCAN_FINISHED: 'scan_finished',
  SCAN_ERROR: 'scan_error',
  SCAN_CANCELLED: 'scan_cancelled',
} as const;

// Dynamically import Tauri APIs only when available
let tauriInvoke: typeof import('@tauri-apps/api/core').invoke | undefined;
let tauriListen: typeof import('@tauri-apps/api/event').listen | undefined;

if (isTauri) {
  import('@tauri-apps/api/core').then((mod) => {
    tauriInvoke = mod.invoke;
  });
  import('@tauri-apps/api/event').then((mod) => {
    tauriListen = mod.listen;
  });
}

/**
 * Starts a duplicate file scan with the given options.
 */
export async function startScan(options: ScanOptions): Promise<ScanResult> {
  if (!isTauri || !tauriInvoke) {
    console.log('[Mock] startScan called');
    return {
      duplicateGroups: [],
      totalFilesScanned: 0,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [],
      durationMs: 0,
    };
  }
  return tauriInvoke<ScanResult>('start_scan', { options });
}

/**
 * Cancels the currently running scan.
 */
export async function cancelScan(): Promise<void> {
  if (!isTauri || !tauriInvoke) {
    console.log('[Mock] cancelScan called');
    return;
  }
  return tauriInvoke('cancel_scan');
}

/**
 * Deletes the specified files.
 * @param filePaths - List of file paths to delete
 * @param useTrash - If true, move to trash; otherwise permanently delete
 */
export async function deleteFiles(
  filePaths: string[],
  useTrash: boolean
): Promise<DeleteResult> {
  if (!isTauri || !tauriInvoke) {
    console.log('[Mock] deleteFiles called');
    return { deleted: [], failed: [] };
  }
  return tauriInvoke<DeleteResult>('delete_files', { filePaths, useTrash });
}

/**
 * Opens a folder selection dialog and returns the selected paths.
 */
export async function selectFolders(): Promise<string[]> {
  if (!isTauri || !tauriInvoke) {
    console.log('[Mock] selectFolders called');
    return ['/mock/test/folder'];
  }
  return tauriInvoke<string[]>('select_folders');
}

/**
 * Listens for scan progress events.
 * @returns A function to unsubscribe from the event
 */
export async function onScanProgress(
  callback: (progress: ScanProgress) => void
): Promise<UnlistenFn> {
  if (!isTauri || !tauriListen) {
    return () => {};
  }
  return tauriListen<ScanProgress>(EVENTS.SCAN_PROGRESS, (event) => {
    callback(event.payload);
  });
}

/**
 * Listens for scan finished events.
 * @returns A function to unsubscribe from the event
 */
export async function onScanFinished(
  callback: (result: ScanResult) => void
): Promise<UnlistenFn> {
  if (!isTauri || !tauriListen) {
    return () => {};
  }
  return tauriListen<ScanResult>(EVENTS.SCAN_FINISHED, (event) => {
    callback(event.payload);
  });
}

/**
 * Listens for scan error events.
 * @returns A function to unsubscribe from the event
 */
export async function onScanError(
  callback: (error: string) => void
): Promise<UnlistenFn> {
  if (!isTauri || !tauriListen) {
    return () => {};
  }
  return tauriListen<string>(EVENTS.SCAN_ERROR, (event) => {
    callback(event.payload);
  });
}

/**
 * Listens for scan cancelled events.
 * @returns A function to unsubscribe from the event
 */
export async function onScanCancelled(
  callback: () => void
): Promise<UnlistenFn> {
  if (!isTauri || !tauriListen) {
    return () => {};
  }
  return tauriListen(EVENTS.SCAN_CANCELLED, () => {
    callback();
  });
}

/**
 * Sets up all scan event listeners at once.
 * @returns A function to unsubscribe from all events
 */
export async function setupScanListeners(handlers: {
  onProgress?: (progress: ScanProgress) => void;
  onFinished?: (result: ScanResult) => void;
  onError?: (error: string) => void;
  onCancelled?: () => void;
}): Promise<UnlistenFn> {
  const unlisteners: UnlistenFn[] = [];

  if (handlers.onProgress) {
    unlisteners.push(await onScanProgress(handlers.onProgress));
  }
  if (handlers.onFinished) {
    unlisteners.push(await onScanFinished(handlers.onFinished));
  }
  if (handlers.onError) {
    unlisteners.push(await onScanError(handlers.onError));
  }
  if (handlers.onCancelled) {
    unlisteners.push(await onScanCancelled(handlers.onCancelled));
  }

  // Return a combined unlisten function
  return () => {
    unlisteners.forEach((unlisten) => unlisten());
  };
}
