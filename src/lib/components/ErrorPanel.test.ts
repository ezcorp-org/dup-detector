import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ErrorPanel from './ErrorPanel.svelte';
import { scanStore } from '../stores/scanStore';
import type { ScanResult } from '../types';

describe('ErrorPanel', () => {
  beforeEach(() => {
    scanStore.reset();
  });

  it('should not render when there are no errors', () => {
    render(ErrorPanel);
    expect(screen.queryByText(/problem/)).not.toBeInTheDocument();
  });

  it('should render when there are errors', () => {
    const result: ScanResult = {
      duplicateGroups: [],
      totalFilesScanned: 10,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [{ path: '/test/path', message: 'Error message' }],
      durationMs: 100,
    };
    scanStore.finishScan(result);

    render(ErrorPanel);
    expect(screen.getByText('1 problem encountered')).toBeInTheDocument();
  });

  it('should show correct pluralization for multiple errors', () => {
    const result: ScanResult = {
      duplicateGroups: [],
      totalFilesScanned: 10,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [
        { path: '/test/path1', message: 'Error 1' },
        { path: '/test/path2', message: 'Error 2' },
      ],
      durationMs: 100,
    };
    scanStore.finishScan(result);

    render(ErrorPanel);
    expect(screen.getByText('2 problems encountered')).toBeInTheDocument();
  });

  it('should display error count badge', () => {
    const result: ScanResult = {
      duplicateGroups: [],
      totalFilesScanned: 10,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [
        { path: '/test/path1', message: 'Error 1' },
        { path: '/test/path2', message: 'Error 2' },
        { path: '/test/path3', message: 'Error 3' },
      ],
      durationMs: 100,
    };
    scanStore.finishScan(result);

    render(ErrorPanel);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should toggle error list on click', async () => {
    const result: ScanResult = {
      duplicateGroups: [],
      totalFilesScanned: 10,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [{ path: '/test/path', message: 'Test error message' }],
      durationMs: 100,
    };
    scanStore.finishScan(result);

    render(ErrorPanel);

    // Initially error details should not be visible
    expect(screen.queryByText('Test error message')).not.toBeInTheDocument();

    // Click to expand
    const header = screen.getByText('1 problem encountered');
    await fireEvent.click(header);

    // Now error details should be visible
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('/test/path')).toBeInTheDocument();
  });

  it('should show dismiss button when expanded', async () => {
    const result: ScanResult = {
      duplicateGroups: [],
      totalFilesScanned: 10,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [{ path: '/test/path', message: 'Error message' }],
      durationMs: 100,
    };
    scanStore.finishScan(result);

    render(ErrorPanel);

    const header = screen.getByText('1 problem encountered');
    await fireEvent.click(header);

    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('should dismiss errors when dismiss button is clicked', async () => {
    const result: ScanResult = {
      duplicateGroups: [],
      totalFilesScanned: 10,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [{ path: '/test/path', message: 'Error message' }],
      durationMs: 100,
    };
    scanStore.finishScan(result);

    render(ErrorPanel);

    // Expand first
    const header = screen.getByText('1 problem encountered');
    await fireEvent.click(header);

    // Click dismiss
    const dismissBtn = screen.getByText('Dismiss');
    await fireEvent.click(dismissBtn);

    // Panel should disappear
    expect(screen.queryByText(/problem/)).not.toBeInTheDocument();
  });

  it('should toggle expand/collapse icon', async () => {
    const result: ScanResult = {
      duplicateGroups: [],
      totalFilesScanned: 10,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [{ path: '/test/path', message: 'Error message' }],
      durationMs: 100,
    };
    scanStore.finishScan(result);

    render(ErrorPanel);

    // Initially shows collapsed icon
    expect(screen.getByText('▶')).toBeInTheDocument();

    // Click to expand
    const header = screen.getByText('1 problem encountered');
    await fireEvent.click(header);

    // Shows expanded icon
    expect(screen.getByText('▼')).toBeInTheDocument();

    // Click to collapse
    await fireEvent.click(header);

    // Back to collapsed icon
    expect(screen.getByText('▶')).toBeInTheDocument();
  });
});
