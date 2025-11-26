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

type UnlistenFn = () => void;

// Event names matching the Rust backend
const EVENTS = {
  SCAN_PROGRESS: 'scan_progress',
  SCAN_FINISHED: 'scan_finished',
  SCAN_ERROR: 'scan_error',
  SCAN_CANCELLED: 'scan_cancelled',
} as const;

// Check if we're running in Tauri v2 context
function isTauriContext(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// Lazily load Tauri APIs
async function getTauriInvoke() {
  if (!isTauriContext()) return undefined;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke;
}

async function getTauriListen() {
  if (!isTauriContext()) return undefined;
  const { listen } = await import('@tauri-apps/api/event');
  return listen;
}

/**
 * Starts a duplicate file scan with the given options.
 */
export async function startScan(options: ScanOptions): Promise<ScanResult> {
  const invoke = await getTauriInvoke();
  if (!invoke) {
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
  return invoke<ScanResult>('start_scan', { options });
}

/**
 * Cancels the currently running scan.
 */
export async function cancelScan(): Promise<void> {
  const invoke = await getTauriInvoke();
  if (!invoke) {
    console.log('[Mock] cancelScan called');
    return;
  }
  return invoke('cancel_scan');
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
  const invoke = await getTauriInvoke();
  if (!invoke) {
    console.log('[Mock] deleteFiles called');
    return { deleted: [], failed: [] };
  }
  return invoke<DeleteResult>('delete_files', { filePaths, useTrash });
}

/**
 * Opens a folder selection dialog and returns the selected paths.
 */
export async function selectFolders(): Promise<string[]> {
  const invoke = await getTauriInvoke();
  if (!invoke) {
    console.log('[Mock] selectFolders called');
    return ['/mock/test/folder'];
  }
  return invoke<string[]>('select_folders');
}

/**
 * Listens for scan progress events.
 * @returns A function to unsubscribe from the event
 */
export async function onScanProgress(
  callback: (progress: ScanProgress) => void
): Promise<UnlistenFn> {
  const listen = await getTauriListen();
  if (!listen) {
    return () => {};
  }
  return listen<ScanProgress>(EVENTS.SCAN_PROGRESS, (event) => {
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
  const listen = await getTauriListen();
  if (!listen) {
    return () => {};
  }
  return listen<ScanResult>(EVENTS.SCAN_FINISHED, (event) => {
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
  const listen = await getTauriListen();
  if (!listen) {
    return () => {};
  }
  return listen<string>(EVENTS.SCAN_ERROR, (event) => {
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
  const listen = await getTauriListen();
  if (!listen) {
    return () => {};
  }
  return listen(EVENTS.SCAN_CANCELLED, () => {
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
