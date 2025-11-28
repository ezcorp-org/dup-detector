import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  scanStore,
  totalWastedSpace,
  selectedFilesCount,
  selectedFilesSize,
  hasSelection,
  groupCount,
  totalDuplicateFiles,
  isScanning,
  hasResults,
  hasErrors,
} from './scanStore';
import type { ScanResult, DuplicateGroup } from '../types';

describe('scanStore', () => {
  beforeEach(() => {
    scanStore.reset();
  });

  describe('initial state', () => {
    it('has idle status', () => {
      expect(get(scanStore).status).toBe('idle');
    });

    it('has empty duplicate groups', () => {
      expect(get(scanStore).duplicateGroups).toEqual([]);
    });

    it('has empty selection', () => {
      expect(get(scanStore).selectedForDeletion.size).toBe(0);
    });
  });

  describe('startScan', () => {
    it('sets status to scanning', () => {
      scanStore.startScan();
      expect(get(scanStore).status).toBe('scanning');
    });

    it('clears previous results', () => {
      // Set some state first
      const mockResult: ScanResult = {
        duplicateGroups: [
          {
            hash: 'abc',
            size: 100,
            files: [
              { path: '/a.txt', size: 100 },
              { path: '/b.txt', size: 100 },
            ],
          },
        ],
        totalFilesScanned: 10,
        totalDuplicatesFound: 2,
        totalWastedSpace: 100,
        errors: [],
        durationMs: 1000,
      };
      scanStore.finishScan(mockResult);

      // Start new scan
      scanStore.startScan();

      expect(get(scanStore).duplicateGroups).toEqual([]);
      expect(get(scanStore).errors).toEqual([]);
    });

    it('clears selections', () => {
      scanStore.toggleFileSelection('/a.txt');
      scanStore.startScan();
      expect(get(scanStore).selectedForDeletion.size).toBe(0);
    });
  });

  describe('finishScan', () => {
    it('sets status to finished', () => {
      const result: ScanResult = {
        duplicateGroups: [],
        totalFilesScanned: 100,
        totalDuplicatesFound: 0,
        totalWastedSpace: 0,
        errors: [],
        durationMs: 500,
      };

      scanStore.startScan();
      scanStore.finishScan(result);

      expect(get(scanStore).status).toBe('finished');
    });

    it('stores duplicate groups', () => {
      const result: ScanResult = {
        duplicateGroups: [
          {
            hash: 'abc123',
            size: 1000,
            files: [
              { path: '/file1.txt', size: 1000 },
              { path: '/file2.txt', size: 1000 },
            ],
          },
        ],
        totalFilesScanned: 100,
        totalDuplicatesFound: 2,
        totalWastedSpace: 1000,
        errors: [],
        durationMs: 500,
      };

      scanStore.startScan();
      scanStore.finishScan(result);

      expect(get(scanStore).duplicateGroups.length).toBe(1);
      expect(get(scanStore).duplicateGroups[0].hash).toBe('abc123');
    });
  });

  describe('cancelScan', () => {
    it('sets status to cancelled', () => {
      scanStore.startScan();
      scanStore.cancelScan();
      expect(get(scanStore).status).toBe('cancelled');
    });
  });

  describe('setError', () => {
    it('sets status to error with message', () => {
      scanStore.setError('Something went wrong');
      expect(get(scanStore).status).toBe('error');
      expect(get(scanStore).errorMessage).toBe('Something went wrong');
    });
  });

  describe('dismissErrors', () => {
    it('clears errors array', () => {
      const result: ScanResult = {
        duplicateGroups: [],
        totalFilesScanned: 10,
        totalDuplicatesFound: 0,
        totalWastedSpace: 0,
        errors: [
          { path: '/bad/path1', message: 'Error 1' },
          { path: '/bad/path2', message: 'Error 2' },
        ],
        durationMs: 100,
      };

      scanStore.finishScan(result);
      expect(get(scanStore).errors.length).toBe(2);

      scanStore.dismissErrors();
      expect(get(scanStore).errors.length).toBe(0);
    });
  });

  describe('file selection', () => {
    it('toggles file selection', () => {
      scanStore.toggleFileSelection('/test.txt');
      expect(get(scanStore).selectedForDeletion.has('/test.txt')).toBe(true);

      scanStore.toggleFileSelection('/test.txt');
      expect(get(scanStore).selectedForDeletion.has('/test.txt')).toBe(false);
    });

    it('selects all but one in group', () => {
      const group: DuplicateGroup = {
        hash: 'abc',
        size: 100,
        files: [
          { path: '/a.txt', size: 100 },
          { path: '/b.txt', size: 100 },
          { path: '/c.txt', size: 100 },
        ],
      };

      scanStore.selectAllButOne(group);

      const selected = get(scanStore).selectedForDeletion;
      expect(selected.has('/a.txt')).toBe(false); // First one kept
      expect(selected.has('/b.txt')).toBe(true);
      expect(selected.has('/c.txt')).toBe(true);
    });

    it('clears group selection', () => {
      const group: DuplicateGroup = {
        hash: 'abc',
        size: 100,
        files: [
          { path: '/a.txt', size: 100 },
          { path: '/b.txt', size: 100 },
        ],
      };

      scanStore.toggleFileSelection('/a.txt');
      scanStore.toggleFileSelection('/b.txt');
      scanStore.clearGroupSelection(group);

      expect(get(scanStore).selectedForDeletion.size).toBe(0);
    });

    it('clears all selections', () => {
      scanStore.toggleFileSelection('/a.txt');
      scanStore.toggleFileSelection('/b.txt');
      scanStore.clearAllSelections();

      expect(get(scanStore).selectedForDeletion.size).toBe(0);
    });

    it('selects all duplicates across all groups', () => {
      const result: ScanResult = {
        duplicateGroups: [
          {
            hash: 'abc',
            size: 100,
            files: [
              { path: '/a.txt', size: 100 },
              { path: '/b.txt', size: 100 },
              { path: '/c.txt', size: 100 },
            ],
          },
          {
            hash: 'def',
            size: 200,
            files: [
              { path: '/d.txt', size: 200 },
              { path: '/e.txt', size: 200 },
            ],
          },
        ],
        totalFilesScanned: 10,
        totalDuplicatesFound: 5,
        totalWastedSpace: 400,
        errors: [],
        durationMs: 100,
      };

      scanStore.finishScan(result);
      scanStore.selectAllDuplicates();

      const selected = get(scanStore).selectedForDeletion;
      // First file of each group should NOT be selected
      expect(selected.has('/a.txt')).toBe(false);
      expect(selected.has('/d.txt')).toBe(false);
      // All other files should be selected
      expect(selected.has('/b.txt')).toBe(true);
      expect(selected.has('/c.txt')).toBe(true);
      expect(selected.has('/e.txt')).toBe(true);
      expect(selected.size).toBe(3);
    });
  });

  describe('removeDeletedFiles', () => {
    it('removes files from groups', () => {
      const result: ScanResult = {
        duplicateGroups: [
          {
            hash: 'abc',
            size: 100,
            files: [
              { path: '/a.txt', size: 100 },
              { path: '/b.txt', size: 100 },
              { path: '/c.txt', size: 100 },
            ],
          },
        ],
        totalFilesScanned: 10,
        totalDuplicatesFound: 3,
        totalWastedSpace: 200,
        errors: [],
        durationMs: 100,
      };

      scanStore.finishScan(result);
      scanStore.removeDeletedFiles(['/b.txt']);

      const groups = get(scanStore).duplicateGroups;
      expect(groups[0].files.length).toBe(2);
      expect(groups[0].files.some((f) => f.path === '/b.txt')).toBe(false);
    });

    it('removes groups with less than 2 files', () => {
      const result: ScanResult = {
        duplicateGroups: [
          {
            hash: 'abc',
            size: 100,
            files: [
              { path: '/a.txt', size: 100 },
              { path: '/b.txt', size: 100 },
            ],
          },
        ],
        totalFilesScanned: 10,
        totalDuplicatesFound: 2,
        totalWastedSpace: 100,
        errors: [],
        durationMs: 100,
      };

      scanStore.finishScan(result);
      scanStore.removeDeletedFiles(['/b.txt']);

      expect(get(scanStore).duplicateGroups.length).toBe(0);
    });

    it('clears deleted files from selection', () => {
      scanStore.toggleFileSelection('/a.txt');
      scanStore.toggleFileSelection('/b.txt');
      scanStore.removeDeletedFiles(['/a.txt']);

      expect(get(scanStore).selectedForDeletion.has('/a.txt')).toBe(false);
      expect(get(scanStore).selectedForDeletion.has('/b.txt')).toBe(true);
    });
  });
});

describe('derived stores', () => {
  beforeEach(() => {
    scanStore.reset();
  });

  it('totalWastedSpace calculates correctly', () => {
    const result: ScanResult = {
      duplicateGroups: [
        {
          hash: 'abc',
          size: 1000,
          files: [
            { path: '/a.txt', size: 1000 },
            { path: '/b.txt', size: 1000 },
          ],
        },
        {
          hash: 'def',
          size: 500,
          files: [
            { path: '/c.txt', size: 500 },
            { path: '/d.txt', size: 500 },
            { path: '/e.txt', size: 500 },
          ],
        },
      ],
      totalFilesScanned: 100,
      totalDuplicatesFound: 5,
      totalWastedSpace: 2000,
      errors: [],
      durationMs: 100,
    };

    scanStore.finishScan(result);

    // (2-1)*1000 + (3-1)*500 = 1000 + 1000 = 2000
    expect(get(totalWastedSpace)).toBe(2000);
  });

  it('selectedFilesCount returns correct count', () => {
    scanStore.toggleFileSelection('/a.txt');
    scanStore.toggleFileSelection('/b.txt');
    expect(get(selectedFilesCount)).toBe(2);
  });

  it('selectedFilesSize calculates correctly', () => {
    const result: ScanResult = {
      duplicateGroups: [
        {
          hash: 'abc',
          size: 1000,
          files: [
            { path: '/a.txt', size: 1000 },
            { path: '/b.txt', size: 1000 },
          ],
        },
      ],
      totalFilesScanned: 10,
      totalDuplicatesFound: 2,
      totalWastedSpace: 1000,
      errors: [],
      durationMs: 100,
    };

    scanStore.finishScan(result);
    scanStore.toggleFileSelection('/a.txt');

    expect(get(selectedFilesSize)).toBe(1000);
  });

  it('hasSelection returns correct value', () => {
    expect(get(hasSelection)).toBe(false);
    scanStore.toggleFileSelection('/a.txt');
    expect(get(hasSelection)).toBe(true);
  });

  it('groupCount returns correct value', () => {
    const result: ScanResult = {
      duplicateGroups: [
        { hash: 'a', size: 100, files: [] },
        { hash: 'b', size: 200, files: [] },
      ],
      totalFilesScanned: 10,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [],
      durationMs: 100,
    };

    scanStore.finishScan(result);
    expect(get(groupCount)).toBe(2);
  });

  it('totalDuplicateFiles returns correct count', () => {
    const result: ScanResult = {
      duplicateGroups: [
        {
          hash: 'abc',
          size: 100,
          files: [
            { path: '/a.txt', size: 100 },
            { path: '/b.txt', size: 100 },
          ],
        },
        {
          hash: 'def',
          size: 200,
          files: [
            { path: '/c.txt', size: 200 },
            { path: '/d.txt', size: 200 },
            { path: '/e.txt', size: 200 },
          ],
        },
      ],
      totalFilesScanned: 10,
      totalDuplicatesFound: 5,
      totalWastedSpace: 0,
      errors: [],
      durationMs: 100,
    };

    scanStore.finishScan(result);
    expect(get(totalDuplicateFiles)).toBe(5); // 2 + 3 files
  });

  it('isScanning returns correct value', () => {
    expect(get(isScanning)).toBe(false);
    scanStore.startScan();
    expect(get(isScanning)).toBe(true);
  });

  it('hasResults returns correct value', () => {
    expect(get(hasResults)).toBe(false);

    const result: ScanResult = {
      duplicateGroups: [
        {
          hash: 'abc',
          size: 100,
          files: [
            { path: '/a.txt', size: 100 },
            { path: '/b.txt', size: 100 },
          ],
        },
      ],
      totalFilesScanned: 10,
      totalDuplicatesFound: 2,
      totalWastedSpace: 100,
      errors: [],
      durationMs: 100,
    };

    scanStore.finishScan(result);
    expect(get(hasResults)).toBe(true);
  });

  it('hasErrors returns correct value', () => {
    expect(get(hasErrors)).toBe(false);

    const result: ScanResult = {
      duplicateGroups: [],
      totalFilesScanned: 10,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [{ path: '/bad/path', message: 'Error' }],
      durationMs: 100,
    };

    scanStore.finishScan(result);
    expect(get(hasErrors)).toBe(true);
  });
});
