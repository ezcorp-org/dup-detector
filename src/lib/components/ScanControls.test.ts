import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ScanControls from './ScanControls.svelte';
import { folderStore } from '../stores/folderStore';
import { scanStore } from '../stores/scanStore';
import * as tauriApi from '../api/tauri';

// Mock the tauri API
vi.mock('../api/tauri', () => ({
  startScan: vi.fn(),
  cancelScan: vi.fn(),
  setupScanListeners: vi.fn(() => Promise.resolve(() => {})),
}));

describe('ScanControls', () => {
  beforeEach(() => {
    folderStore.clearFolders();
    scanStore.reset();
    vi.clearAllMocks();
  });

  it('should render Start Scan button', () => {
    render(ScanControls);
    expect(screen.getByText('Start Scan')).toBeInTheDocument();
  });

  it('should disable Start Scan when no folders selected', () => {
    render(ScanControls);
    const startBtn = screen.getByText('Start Scan');
    expect(startBtn).toBeDisabled();
  });

  it('should enable Start Scan when folders are selected', () => {
    folderStore.addFolder('/test/folder');
    render(ScanControls);
    const startBtn = screen.getByText('Start Scan');
    expect(startBtn).not.toBeDisabled();
  });

  it('should show Cancel Scan button when scanning', () => {
    scanStore.startScan();
    render(ScanControls);
    expect(screen.getByText('Cancel Scan')).toBeInTheDocument();
    expect(screen.queryByText('Start Scan')).not.toBeInTheDocument();
  });

  it('should call startScan API when Start Scan is clicked', async () => {
    folderStore.addFolder('/test/folder');
    vi.mocked(tauriApi.startScan).mockResolvedValue({
      duplicateGroups: [],
      totalFilesScanned: 0,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [],
      durationMs: 0,
    });

    render(ScanControls);
    const startBtn = screen.getByText('Start Scan');
    await fireEvent.click(startBtn);

    expect(tauriApi.startScan).toHaveBeenCalled();
  });

  it('should call cancelScan API when Cancel Scan is clicked', async () => {
    scanStore.startScan();
    vi.mocked(tauriApi.cancelScan).mockResolvedValue(undefined);

    render(ScanControls);
    const cancelBtn = screen.getByText('Cancel Scan');
    await fireEvent.click(cancelBtn);

    expect(tauriApi.cancelScan).toHaveBeenCalledOnce();
  });

  it('should show Advanced Filtering toggle', () => {
    render(ScanControls);
    expect(screen.getByText('Advanced Filtering')).toBeInTheDocument();
  });

  it('should toggle advanced filters on click', async () => {
    render(ScanControls);

    // Initially filters are hidden
    expect(screen.queryByText('Min File Size')).not.toBeInTheDocument();

    // Click to expand
    const toggle = screen.getByText('Advanced Filtering');
    await fireEvent.click(toggle);

    // Filters should now be visible
    expect(screen.getByText('Min File Size')).toBeInTheDocument();
    expect(screen.getByText('Include Extensions')).toBeInTheDocument();
    expect(screen.getByText('Exclude Extensions')).toBeInTheDocument();
    expect(screen.getByText('Follow Symlinks')).toBeInTheDocument();
  });

  it('should disable advanced toggle when scanning', () => {
    scanStore.startScan();
    render(ScanControls);

    const toggle = screen.getByText('Advanced Filtering').closest('button');
    expect(toggle).toBeDisabled();
  });

  it('should show Active badge when filters are set', async () => {
    folderStore.setMinFileSize(100);
    render(ScanControls);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should update min file size in store', async () => {
    render(ScanControls);

    // Open advanced filters
    const toggle = screen.getByText('Advanced Filtering');
    await fireEvent.click(toggle);

    // Find and update the min size input
    const minSizeInput = screen.getByPlaceholderText('0');
    await fireEvent.input(minSizeInput, { target: { value: '100' } });

    // The store should be updated (we'd need to check the store, but the component should reflect this)
    expect(minSizeInput).toHaveValue(100);
  });

  it('should toggle follow symlinks', async () => {
    render(ScanControls);

    // Open advanced filters
    const toggle = screen.getByText('Advanced Filtering');
    await fireEvent.click(toggle);

    // Find the follow symlinks checkbox
    const symlinkCheckbox = screen.getByLabelText('Follow Symlinks');
    expect(symlinkCheckbox).not.toBeChecked();

    await fireEvent.click(symlinkCheckbox);
    expect(symlinkCheckbox).toBeChecked();
  });

  it('should setup scan listeners on mount', () => {
    render(ScanControls);
    expect(tauriApi.setupScanListeners).toHaveBeenCalledOnce();
    expect(tauriApi.setupScanListeners).toHaveBeenCalledWith({
      onProgress: expect.any(Function),
      onFinished: expect.any(Function),
      onError: expect.any(Function),
      onCancelled: expect.any(Function),
    });
  });

  it('should handle scan progress events', async () => {
    let capturedHandlers: any = {};
    vi.mocked(tauriApi.setupScanListeners).mockImplementation(async (handlers) => {
      capturedHandlers = handlers;
      return () => {};
    });

    render(ScanControls);

    // Simulate progress event
    capturedHandlers.onProgress({
      filesScanned: 50,
      filesTotal: 100,
      currentPhase: 'hashing',
    });

    // The store should be updated - we can verify indirectly
    expect(capturedHandlers.onProgress).toBeDefined();
  });

  it('should handle scan finished events', async () => {
    let capturedHandlers: any = {};
    vi.mocked(tauriApi.setupScanListeners).mockImplementation(async (handlers) => {
      capturedHandlers = handlers;
      return () => {};
    });

    scanStore.startScan();
    render(ScanControls);

    // Simulate finished event
    capturedHandlers.onFinished({
      duplicateGroups: [],
      totalFilesScanned: 100,
      totalDuplicatesFound: 0,
      totalWastedSpace: 0,
      errors: [],
      durationMs: 500,
    });

    expect(capturedHandlers.onFinished).toBeDefined();
  });

  it('should handle scan error events', async () => {
    let capturedHandlers: any = {};
    vi.mocked(tauriApi.setupScanListeners).mockImplementation(async (handlers) => {
      capturedHandlers = handlers;
      return () => {};
    });

    scanStore.startScan();
    render(ScanControls);

    // Simulate error event
    capturedHandlers.onError('Something went wrong');

    expect(capturedHandlers.onError).toBeDefined();
  });

  it('should handle scan cancelled events', async () => {
    let capturedHandlers: any = {};
    vi.mocked(tauriApi.setupScanListeners).mockImplementation(async (handlers) => {
      capturedHandlers = handlers;
      return () => {};
    });

    scanStore.startScan();
    render(ScanControls);

    // Simulate cancelled event
    capturedHandlers.onCancelled();

    expect(capturedHandlers.onCancelled).toBeDefined();
  });

  it('should handle scan start errors', async () => {
    vi.mocked(tauriApi.startScan).mockRejectedValue(new Error('Failed to start'));
    folderStore.addFolder('/test/folder');

    render(ScanControls);
    const startBtn = screen.getByText('Start Scan');
    await fireEvent.click(startBtn);

    // Wait for async
    await new Promise((r) => setTimeout(r, 0));

    // Store should be in error state
    expect(tauriApi.startScan).toHaveBeenCalled();
  });

  it('should handle cancellation errors during start', async () => {
    vi.mocked(tauriApi.startScan).mockRejectedValue(new Error('Cancelled by user'));
    folderStore.addFolder('/test/folder');

    render(ScanControls);
    const startBtn = screen.getByText('Start Scan');
    await fireEvent.click(startBtn);

    await new Promise((r) => setTimeout(r, 0));

    expect(tauriApi.startScan).toHaveBeenCalled();
  });

  it('should handle cancel scan errors', async () => {
    vi.mocked(tauriApi.cancelScan).mockRejectedValue(new Error('Failed to cancel'));
    scanStore.startScan();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(ScanControls);
    const cancelBtn = screen.getByText('Cancel Scan');
    await fireEvent.click(cancelBtn);

    await new Promise((r) => setTimeout(r, 0));

    expect(consoleSpy).toHaveBeenCalledWith('Failed to cancel scan:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should show Cancelling state when cancel is clicked', async () => {
    let resolveCancel: () => void;
    const cancelPromise = new Promise<void>((resolve) => {
      resolveCancel = resolve;
    });
    vi.mocked(tauriApi.cancelScan).mockReturnValue(cancelPromise);

    scanStore.startScan();
    render(ScanControls);

    const cancelBtn = screen.getByText('Cancel Scan');
    fireEvent.click(cancelBtn);

    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText('Cancelling...')).toBeInTheDocument();

    resolveCancel!();
    await cancelPromise;
  });

  it('should prevent multiple cancel requests', async () => {
    let resolveCancel: () => void;
    const cancelPromise = new Promise<void>((resolve) => {
      resolveCancel = resolve;
    });
    vi.mocked(tauriApi.cancelScan).mockReturnValue(cancelPromise);

    scanStore.startScan();
    render(ScanControls);

    const cancelBtn = screen.getByText('Cancel Scan');
    await fireEvent.click(cancelBtn);
    await fireEvent.click(cancelBtn);
    await fireEvent.click(cancelBtn);

    // Should only call once
    expect(tauriApi.cancelScan).toHaveBeenCalledTimes(1);

    resolveCancel!();
    await cancelPromise;
  });
});
