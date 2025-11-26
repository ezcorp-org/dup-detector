import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DeleteControls from './DeleteControls.svelte';
import { scanStore } from '../stores/scanStore';
import * as tauriApi from '../api/tauri';
import type { ScanResult } from '../types';

// Mock the tauri API
vi.mock('../api/tauri', () => ({
  deleteFiles: vi.fn(),
}));

describe('DeleteControls', () => {
  beforeEach(() => {
    scanStore.reset();
    vi.clearAllMocks();
  });

  it('should not render when no results and no selection', () => {
    render(DeleteControls);
    expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument();
  });

  it('should render when there are results', () => {
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

    render(DeleteControls);
    expect(screen.getByRole('button', { name: /Delete All Duplicates/ })).toBeInTheDocument();
  });

  it('should show hint when results exist but nothing selected', () => {
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

    render(DeleteControls);
    expect(
      screen.getByText('Select files to delete or use "Delete All Duplicates"')
    ).toBeInTheDocument();
  });

  it('should show selection info when files are selected', () => {
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

    render(DeleteControls);
    expect(screen.getByText('1 file selected')).toBeInTheDocument();
  });

  it('should show Move to Trash checkbox (checked by default)', () => {
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

    render(DeleteControls);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should show warning when Move to Trash is unchecked', async () => {
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

    render(DeleteControls);
    const checkbox = screen.getByRole('checkbox');
    await fireEvent.click(checkbox);

    expect(
      screen.getByText('Files will be permanently deleted!')
    ).toBeInTheDocument();
  });

  it('should show Delete Selected button when files selected', () => {
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
    scanStore.toggleFileSelection('/a.txt');

    render(DeleteControls);
    expect(screen.getByText('Delete Selected')).toBeInTheDocument();
  });

  it('should show Clear Selection button when files selected', () => {
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
    scanStore.toggleFileSelection('/a.txt');

    render(DeleteControls);
    expect(screen.getByText('Clear Selection')).toBeInTheDocument();
  });

  it('should clear selection when Clear Selection is clicked', async () => {
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
    scanStore.toggleFileSelection('/a.txt');

    render(DeleteControls);
    const clearBtn = screen.getByText('Clear Selection');
    await fireEvent.click(clearBtn);

    expect(screen.queryByText('1 file selected')).not.toBeInTheDocument();
  });

  it('should show confirm dialog when Delete Selected is clicked', async () => {
    vi.mocked(tauriApi.deleteFiles).mockResolvedValue({
      deleted: [],
      failed: [],
    });

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
    scanStore.toggleFileSelection('/a.txt');

    render(DeleteControls);
    const deleteBtn = screen.getByText('Delete Selected');
    await fireEvent.click(deleteBtn);

    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
  });

  it('should select all duplicates and show confirm dialog for Delete All', async () => {
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

    render(DeleteControls);
    // Use a more specific query to avoid matching multiple elements
    const deleteAllBtn = screen.getByRole('button', { name: /Delete All Duplicates/ });
    await fireEvent.click(deleteAllBtn);

    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
  });

  it('should complete deletion flow and show success message', async () => {
    vi.mocked(tauriApi.deleteFiles).mockResolvedValue({
      deleted: ['/a.txt'],
      failed: [],
    });

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
    scanStore.toggleFileSelection('/a.txt');

    render(DeleteControls);
    const deleteBtn = screen.getByText('Delete Selected');
    await fireEvent.click(deleteBtn);

    // Confirm dialog
    const confirmBtn = screen.getByRole('button', { name: 'Move to Trash' });
    await fireEvent.click(confirmBtn);

    // Wait for async
    await new Promise((r) => setTimeout(r, 0));

    expect(tauriApi.deleteFiles).toHaveBeenCalledWith(['/a.txt'], true);
    expect(screen.getByText(/Successfully deleted 1 file/)).toBeInTheDocument();
  });

  it('should show partial success message', async () => {
    vi.mocked(tauriApi.deleteFiles).mockResolvedValue({
      deleted: ['/a.txt'],
      failed: [{ path: '/b.txt', reason: 'Permission denied' }],
    });

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
    scanStore.toggleFileSelection('/a.txt');
    scanStore.toggleFileSelection('/b.txt');

    render(DeleteControls);
    const deleteBtn = screen.getByText('Delete Selected');
    await fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Move to Trash' });
    await fireEvent.click(confirmBtn);

    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText(/Deleted 1 file.*1 failed/)).toBeInTheDocument();
  });

  it('should show error message when deletion fails completely', async () => {
    vi.mocked(tauriApi.deleteFiles).mockRejectedValue(new Error('Permission denied'));

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
    scanStore.toggleFileSelection('/a.txt');

    render(DeleteControls);
    const deleteBtn = screen.getByText('Delete Selected');
    await fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Move to Trash' });
    await fireEvent.click(confirmBtn);

    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText('Failed to delete files')).toBeInTheDocument();
  });

  it('should cancel delete dialog and hide it', async () => {
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
    scanStore.toggleFileSelection('/a.txt');

    render(DeleteControls);
    const deleteBtn = screen.getByText('Delete Selected');
    await fireEvent.click(deleteBtn);

    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();

    const cancelBtn = screen.getByText('Cancel');
    await fireEvent.click(cancelBtn);

    expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument();
  });

  it('should cancel delete all and clear selections', async () => {
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

    render(DeleteControls);
    const deleteAllBtn = screen.getByRole('button', { name: /Delete All Duplicates/ });
    await fireEvent.click(deleteAllBtn);

    // Cancel the dialog
    const cancelBtn = screen.getByText('Cancel');
    await fireEvent.click(cancelBtn);

    // Dialog should be closed and selections cleared
    expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument();
  });
});
