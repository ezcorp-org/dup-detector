import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DuplicateGroups from './DuplicateGroups.svelte';
import { scanStore } from '../stores/scanStore';
import * as tauriApi from '../api/tauri';
import type { ScanResult } from '../types';

// Mock the tauri API
vi.mock('../api/tauri', () => ({
  deleteFiles: vi.fn(),
}));

describe('DuplicateGroups', () => {
  beforeEach(() => {
    scanStore.reset();
    vi.clearAllMocks();
  });

  const createScanResult = (groups = 1, filesPerGroup = 2): ScanResult => ({
    duplicateGroups: Array.from({ length: groups }, (_, i) => ({
      hash: `hash${i}`,
      size: 1000 * (i + 1),
      files: Array.from({ length: filesPerGroup }, (_, j) => ({
        path: `/folder${i}/file${j}.txt`,
        size: 1000 * (i + 1),
        modified: '2024-01-15T10:30:00Z',
      })),
    })),
    totalFilesScanned: 100,
    totalDuplicatesFound: groups * filesPerGroup,
    totalWastedSpace: groups * 1000 * (filesPerGroup - 1),
    errors: [],
    durationMs: 500,
  });

  it('should not render when no results', () => {
    render(DuplicateGroups);
    expect(screen.queryByText(/duplicate files/)).not.toBeInTheDocument();
  });

  it('should show "No Duplicates Found" when finished with no duplicates', () => {
    const result: ScanResult = {
      duplicateGroups: [],
      totalFilesScanned: 100,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [],
      durationMs: 500,
    };
    scanStore.finishScan(result);

    render(DuplicateGroups);
    expect(screen.getByText('No Duplicates Found')).toBeInTheDocument();
    expect(
      screen.getByText('Great news! No duplicate files were found in the selected folders.')
    ).toBeInTheDocument();
  });

  it('should render summary with group count', () => {
    scanStore.finishScan(createScanResult(3, 2));

    render(DuplicateGroups);
    expect(screen.getByText('3')).toBeInTheDocument(); // group count
  });

  it('should render summary with duplicate file count', () => {
    scanStore.finishScan(createScanResult(2, 3));

    render(DuplicateGroups);
    expect(screen.getByText('6')).toBeInTheDocument(); // total duplicate files
  });

  it('should render duplicate groups', () => {
    scanStore.finishScan(createScanResult(2, 2));

    render(DuplicateGroups);
    // Check that group headers are visible (will be multiple "2 files" texts)
    const groupHeaders = screen.getAllByText('2 files');
    expect(groupHeaders.length).toBe(2);
  });

  it('should toggle group expansion on click', async () => {
    scanStore.finishScan(createScanResult(1, 2));

    render(DuplicateGroups);

    // Initially files are not visible (group is collapsed)
    expect(screen.queryByText('file0.txt')).not.toBeInTheDocument();

    // Click to expand
    const groupHeader = screen.getByText('2 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    // Files should now be visible
    expect(screen.getByText('file0.txt')).toBeInTheDocument();
    expect(screen.getByText('file1.txt')).toBeInTheDocument();
  });

  it('should show "Keep" badge on first file', async () => {
    scanStore.finishScan(createScanResult(1, 2));

    render(DuplicateGroups);

    // Expand the group
    const groupHeader = screen.getByText('2 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('should show "Select All But One" button when expanded', async () => {
    scanStore.finishScan(createScanResult(1, 2));

    render(DuplicateGroups);

    // Expand the group
    const groupHeader = screen.getByText('2 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    expect(screen.getByText('Select All But One')).toBeInTheDocument();
  });

  it('should select all but one when button clicked', async () => {
    scanStore.finishScan(createScanResult(1, 3));

    render(DuplicateGroups);

    // Expand the group
    const groupHeader = screen.getByText('3 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    // Click Select All But One
    const selectBtn = screen.getByText('Select All But One');
    await fireEvent.click(selectBtn);

    // Clear Selection button should appear (indicating selection was made)
    expect(screen.getByText('Clear Selection')).toBeInTheDocument();
  });

  it('should toggle file selection on checkbox click', async () => {
    scanStore.finishScan(createScanResult(1, 2));

    render(DuplicateGroups);

    // Expand the group
    const groupHeader = screen.getByText('2 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    // Find checkboxes and click one
    const checkboxes = screen.getAllByRole('checkbox');
    await fireEvent.click(checkboxes[0]);

    // The checkbox should now be checked
    expect(checkboxes[0]).toBeChecked();
  });

  it('should toggle file details on file click', async () => {
    scanStore.finishScan(createScanResult(1, 2));

    render(DuplicateGroups);

    // Expand the group
    const groupHeader = screen.getByText('2 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    // Click on file item header (not checkbox)
    const fileItem = screen.getByText('file0.txt').closest('.file-item-header');
    if (fileItem) {
      await fireEvent.click(fileItem);
    }

    // File details should be visible
    expect(screen.getByText('Full Path:')).toBeInTheDocument();
  });

  it('should show file size in details', async () => {
    scanStore.finishScan(createScanResult(1, 2));

    render(DuplicateGroups);

    // Expand the group
    const groupHeader = screen.getByText('2 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    // Click on file to expand details
    const fileItem = screen.getByText('file0.txt').closest('.file-item-header');
    if (fileItem) {
      await fireEvent.click(fileItem);
    }

    expect(screen.getByText('Size:')).toBeInTheDocument();
  });

  it('should show modified date in details', async () => {
    scanStore.finishScan(createScanResult(1, 2));

    render(DuplicateGroups);

    // Expand the group
    const groupHeader = screen.getByText('2 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    // Click on file to expand details
    const fileItem = screen.getByText('file0.txt').closest('.file-item-header');
    if (fileItem) {
      await fireEvent.click(fileItem);
    }

    expect(screen.getByText('Modified:')).toBeInTheDocument();
  });

  it('should show delete button for each file', async () => {
    scanStore.finishScan(createScanResult(1, 2));

    render(DuplicateGroups);

    // Expand the group
    const groupHeader = screen.getByText('2 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    // Each file should have a delete button
    const deleteButtons = screen.getAllByTitle('Delete this file');
    expect(deleteButtons.length).toBe(2);
  });

  it('should show confirm dialog when delete button clicked', async () => {
    scanStore.finishScan(createScanResult(1, 2));

    render(DuplicateGroups);

    // Expand the group
    const groupHeader = screen.getByText('2 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    // Click delete button on first file
    const deleteButtons = screen.getAllByTitle('Delete this file');
    await fireEvent.click(deleteButtons[0]);

    // Confirm dialog should appear
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
  });

  it('should show selected badge in group header', async () => {
    scanStore.finishScan(createScanResult(1, 3));

    render(DuplicateGroups);

    // Expand the group and select files
    const groupHeader = screen.getByText('3 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    // Select all but one
    const selectBtn = screen.getByText('Select All But One');
    await fireEvent.click(selectBtn);

    // Selected badge should show count
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('should clear group selection when Clear Selection clicked', async () => {
    scanStore.finishScan(createScanResult(1, 3));

    render(DuplicateGroups);

    // Expand and select
    const groupHeader = screen.getByText('3 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    const selectBtn = screen.getByText('Select All But One');
    await fireEvent.click(selectBtn);

    // Clear selection
    const clearBtn = screen.getByText('Clear Selection');
    await fireEvent.click(clearBtn);

    // Selected badge should disappear
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('should handle unknown modified date', async () => {
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

    render(DuplicateGroups);

    // Expand group
    const groupHeader = screen.getByText('2 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    // Click on file to expand details
    const fileItem = screen.getByText('a.txt').closest('.file-item-header');
    if (fileItem) {
      await fireEvent.click(fileItem);
    }

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('should delete file and remove from list', async () => {
    vi.mocked(tauriApi.deleteFiles).mockResolvedValue({
      deleted: ['/folder0/file1.txt'],
      failed: [],
    });

    scanStore.finishScan(createScanResult(1, 2));

    render(DuplicateGroups);

    // Expand the group
    const groupHeader = screen.getByText('2 files').closest('button');
    if (groupHeader) {
      await fireEvent.click(groupHeader);
    }

    // Click delete button on second file
    const deleteButtons = screen.getAllByTitle('Delete this file');
    await fireEvent.click(deleteButtons[1]);

    // Confirm dialog appears
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();

    // Click confirm button
    const confirmBtn = screen.getByText('Move to Trash');
    await fireEvent.click(confirmBtn);

    // Wait for async operations
    await new Promise((r) => setTimeout(r, 0));

    expect(tauriApi.deleteFiles).toHaveBeenCalledWith(['/folder0/file1.txt'], true);
  });
});
