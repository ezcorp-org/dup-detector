import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  startScan,
  cancelScan,
  deleteFiles,
  selectFolders,
  onScanProgress,
  onScanFinished,
  onScanError,
  onScanCancelled,
  setupScanListeners,
} from './tauri';

describe('Tauri API (mock mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startScan', () => {
    it('should return empty result in mock mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await startScan({
        rootPaths: ['/test/path'],
        followSymlinks: false,
      });

      expect(result).toEqual({
        duplicateGroups: [],
        totalFilesScanned: 0,
        totalDuplicatesFound: 0,
        totalWastedSpace: 0,
        errors: [],
        durationMs: 0,
      });
      expect(consoleSpy).toHaveBeenCalledWith('[Mock] startScan called');

      consoleSpy.mockRestore();
    });
  });

  describe('cancelScan', () => {
    it('should return undefined in mock mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await cancelScan();

      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('[Mock] cancelScan called');

      consoleSpy.mockRestore();
    });
  });

  describe('deleteFiles', () => {
    it('should return empty result in mock mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await deleteFiles(['/test/file.txt'], true);

      expect(result).toEqual({ deleted: [], failed: [] });
      expect(consoleSpy).toHaveBeenCalledWith('[Mock] deleteFiles called');

      consoleSpy.mockRestore();
    });
  });

  describe('selectFolders', () => {
    it('should return mock folder in mock mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await selectFolders();

      expect(result).toEqual(['/mock/test/folder']);
      expect(consoleSpy).toHaveBeenCalledWith('[Mock] selectFolders called');

      consoleSpy.mockRestore();
    });
  });

  describe('onScanProgress', () => {
    it('should return noop unlisten function in mock mode', async () => {
      const callback = vi.fn();
      const unlisten = await onScanProgress(callback);

      expect(typeof unlisten).toBe('function');
      // Calling unlisten should not throw
      unlisten();
      // Callback should not have been called
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('onScanFinished', () => {
    it('should return noop unlisten function in mock mode', async () => {
      const callback = vi.fn();
      const unlisten = await onScanFinished(callback);

      expect(typeof unlisten).toBe('function');
      unlisten();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('onScanError', () => {
    it('should return noop unlisten function in mock mode', async () => {
      const callback = vi.fn();
      const unlisten = await onScanError(callback);

      expect(typeof unlisten).toBe('function');
      unlisten();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('onScanCancelled', () => {
    it('should return noop unlisten function in mock mode', async () => {
      const callback = vi.fn();
      const unlisten = await onScanCancelled(callback);

      expect(typeof unlisten).toBe('function');
      unlisten();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('setupScanListeners', () => {
    it('should return combined unlisten function', async () => {
      const handlers = {
        onProgress: vi.fn(),
        onFinished: vi.fn(),
        onError: vi.fn(),
        onCancelled: vi.fn(),
      };

      const unlisten = await setupScanListeners(handlers);

      expect(typeof unlisten).toBe('function');
      // Calling unlisten should not throw
      unlisten();
    });

    it('should handle empty handlers', async () => {
      const unlisten = await setupScanListeners({});

      expect(typeof unlisten).toBe('function');
      unlisten();
    });

    it('should handle partial handlers', async () => {
      const unlisten = await setupScanListeners({
        onProgress: vi.fn(),
      });

      expect(typeof unlisten).toBe('function');
      unlisten();
    });
  });
});
