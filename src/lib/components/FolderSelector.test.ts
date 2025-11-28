import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FolderSelector from './FolderSelector.svelte';
import { folderStore } from '../stores/folderStore';
import * as tauriApi from '../api/tauri';

// Mock the tauri API
vi.mock('../api/tauri', () => ({
  selectFolders: vi.fn(),
}));

describe('FolderSelector', () => {
  beforeEach(() => {
    folderStore.clearFolders();
    vi.clearAllMocks();
  });

  it('should render with title', () => {
    render(FolderSelector);
    expect(screen.getByText('Folders to Scan')).toBeInTheDocument();
  });

  it('should show empty state when no folders', () => {
    render(FolderSelector);
    expect(
      screen.getByText('No folders selected. Click "Add Folder" to start.')
    ).toBeInTheDocument();
  });

  it('should show Add Folder button', () => {
    render(FolderSelector);
    expect(screen.getByText('Add Folder')).toBeInTheDocument();
  });

  it('should not show Clear All button when no folders', () => {
    render(FolderSelector);
    expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
  });

  it('should show Clear All button when folders exist', () => {
    folderStore.addFolder('/test/folder');
    render(FolderSelector);
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('should display folder paths', () => {
    folderStore.addFolders(['/path/to/folder1', '/path/to/folder2']);
    render(FolderSelector);
    expect(screen.getByText('/path/to/folder1')).toBeInTheDocument();
    expect(screen.getByText('/path/to/folder2')).toBeInTheDocument();
  });

  it('should call selectFolders when Add Folder is clicked', async () => {
    const mockSelectFolders = vi
      .mocked(tauriApi.selectFolders)
      .mockResolvedValue(['/new/folder']);

    render(FolderSelector);
    const addBtn = screen.getByText('Add Folder');
    await fireEvent.click(addBtn);

    expect(mockSelectFolders).toHaveBeenCalledOnce();
  });

  it('should show loading state while selecting folders', async () => {
    let resolvePromise: (value: string[]) => void;
    const promise = new Promise<string[]>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(tauriApi.selectFolders).mockReturnValue(promise);

    render(FolderSelector);
    const addBtn = screen.getByText('Add Folder');
    fireEvent.click(addBtn);

    // Wait a tick for the loading state to be set
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText('Selecting...')).toBeInTheDocument();
    expect(addBtn).toBeDisabled();

    // Resolve the promise to clean up
    resolvePromise!([]);
    await promise;
  });

  it('should add selected folders to store', async () => {
    vi.mocked(tauriApi.selectFolders).mockResolvedValue(['/selected/folder']);

    render(FolderSelector);
    const addBtn = screen.getByText('Add Folder');
    await fireEvent.click(addBtn);

    // Wait for the async operation
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText('/selected/folder')).toBeInTheDocument();
  });

  it('should show error message on failure', async () => {
    vi.mocked(tauriApi.selectFolders).mockRejectedValue(new Error('Test error'));

    render(FolderSelector);
    const addBtn = screen.getByText('Add Folder');
    await fireEvent.click(addBtn);

    // Wait for the async operation
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should remove folder when remove button is clicked', async () => {
    folderStore.addFolders(['/folder1', '/folder2']);
    render(FolderSelector);

    expect(screen.getByText('/folder1')).toBeInTheDocument();

    const removeButtons = screen.getAllByTitle('Remove folder');
    await fireEvent.click(removeButtons[0]);

    expect(screen.queryByText('/folder1')).not.toBeInTheDocument();
    expect(screen.getByText('/folder2')).toBeInTheDocument();
  });

  it('should clear all folders when Clear All is clicked', async () => {
    folderStore.addFolders(['/folder1', '/folder2']);
    render(FolderSelector);

    const clearBtn = screen.getByText('Clear All');
    await fireEvent.click(clearBtn);

    expect(screen.queryByText('/folder1')).not.toBeInTheDocument();
    expect(screen.queryByText('/folder2')).not.toBeInTheDocument();
    expect(
      screen.getByText('No folders selected. Click "Add Folder" to start.')
    ).toBeInTheDocument();
  });
});
