import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ConfirmDialog from './ConfirmDialog.svelte';

describe('ConfirmDialog', () => {
  const defaultProps = {
    filePaths: ['/test/file1.txt', '/test/file2.txt'],
    useTrash: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('should render dialog with title', () => {
    render(ConfirmDialog, { props: defaultProps });
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
  });

  it('should show file count in message', () => {
    render(ConfirmDialog, { props: defaultProps });
    expect(screen.getByText(/2 files/)).toBeInTheDocument();
  });

  it('should show singular for single file', () => {
    render(ConfirmDialog, {
      props: { ...defaultProps, filePaths: ['/test/file.txt'] },
    });
    expect(screen.getByText(/1 file\?/)).toBeInTheDocument();
  });

  it('should show move to trash message when useTrash is true', () => {
    render(ConfirmDialog, { props: defaultProps });
    expect(screen.getByText(/move to trash/)).toBeInTheDocument();
    expect(screen.getByText('Move to Trash')).toBeInTheDocument();
  });

  it('should show permanently delete message when useTrash is false', () => {
    render(ConfirmDialog, {
      props: { ...defaultProps, useTrash: false },
    });
    expect(screen.getByText(/permanently delete.*2 files/)).toBeInTheDocument();
    expect(screen.getByText('Delete Permanently')).toBeInTheDocument();
  });

  it('should show danger warning when not using trash', () => {
    render(ConfirmDialog, {
      props: { ...defaultProps, useTrash: false },
    });
    expect(
      screen.getByText(/These files will be permanently deleted/)
    ).toBeInTheDocument();
  });

  it('should not show danger warning when using trash', () => {
    render(ConfirmDialog, { props: defaultProps });
    expect(
      screen.queryByText(/These files will be permanently deleted/)
    ).not.toBeInTheDocument();
  });

  it('should display file names', () => {
    render(ConfirmDialog, { props: defaultProps });
    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('file2.txt')).toBeInTheDocument();
  });

  it('should limit displayed files to 10', () => {
    const manyFiles = Array.from({ length: 15 }, (_, i) => `/test/file${i}.txt`);
    render(ConfirmDialog, {
      props: { ...defaultProps, filePaths: manyFiles },
    });
    expect(screen.getByText(/\.\.\.and 5 more files/)).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(ConfirmDialog, {
      props: { ...defaultProps, onConfirm },
    });

    const confirmBtn = screen.getByText('Move to Trash');
    await fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(ConfirmDialog, {
      props: { ...defaultProps, onCancel },
    });

    const cancelBtn = screen.getByText('Cancel');
    await fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('should call onCancel when overlay is clicked', async () => {
    const onCancel = vi.fn();
    render(ConfirmDialog, {
      props: { ...defaultProps, onCancel },
    });

    const overlay = document.querySelector('.overlay');
    if (overlay) {
      await fireEvent.click(overlay);
    }

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('should not call onCancel when dialog content is clicked', async () => {
    const onCancel = vi.fn();
    render(ConfirmDialog, {
      props: { ...defaultProps, onCancel },
    });

    const dialog = document.querySelector('.dialog');
    if (dialog) {
      await fireEvent.click(dialog);
    }

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should call onCancel when Escape key is pressed', async () => {
    const onCancel = vi.fn();
    render(ConfirmDialog, {
      props: { ...defaultProps, onCancel },
    });

    await fireEvent.keyDown(window, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
