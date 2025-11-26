<script lang="ts">
  import {
    scanStore,
    hasSelection,
    selectedFilesCount,
    selectedFilesSize,
  } from '../stores/scanStore';
  import { deleteFiles } from '../api/tauri';
  import { formatBytes, pluralize } from '../utils/format';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let useTrash = true;
  let showConfirmDialog = false;
  let deleting = false;
  let deleteResult: { deleted: number; failed: number } | null = null;

  async function handleDelete() {
    showConfirmDialog = true;
  }

  async function confirmDelete() {
    showConfirmDialog = false;
    deleting = true;
    deleteResult = null;

    try {
      const filePaths = Array.from($scanStore.selectedForDeletion);
      const result = await deleteFiles(filePaths, useTrash);

      deleteResult = {
        deleted: result.deleted.length,
        failed: result.failed.length,
      };

      // Remove successfully deleted files from the store
      if (result.deleted.length > 0) {
        scanStore.removeDeletedFiles(result.deleted);
      }

      // Show result for a few seconds then clear
      setTimeout(() => {
        deleteResult = null;
      }, 5000);
    } catch (e) {
      console.error('Delete failed:', e);
      deleteResult = { deleted: 0, failed: $selectedFilesCount };
    } finally {
      deleting = false;
    }
  }

  function cancelDelete() {
    showConfirmDialog = false;
  }

  function getSelectedPaths(): string[] {
    return Array.from($scanStore.selectedForDeletion);
  }
</script>

{#if $hasSelection || deleteResult}
  <div class="delete-controls">
    <div class="selection-info">
      <span class="count">
        {pluralize($selectedFilesCount, 'file')} selected
      </span>
      <span class="size">({formatBytes($selectedFilesSize)})</span>
    </div>

    <div class="options">
      <label class="trash-toggle">
        <input type="checkbox" bind:checked={useTrash} disabled={deleting} />
        <span>Move to Trash</span>
      </label>
      {#if !useTrash}
        <span class="warning">Files will be permanently deleted!</span>
      {/if}
    </div>

    <div class="actions">
      <button
        class="btn btn-clear"
        onclick={() => scanStore.clearAllSelections()}
        disabled={deleting}
      >
        Clear Selection
      </button>
      <button
        class="btn btn-delete"
        onclick={handleDelete}
        disabled={!$hasSelection || deleting}
      >
        {#if deleting}
          Deleting...
        {:else}
          Delete Selected
        {/if}
      </button>
    </div>

    {#if deleteResult}
      <div class="result" class:success={deleteResult.failed === 0}>
        {#if deleteResult.failed === 0}
          Successfully deleted {deleteResult.deleted} files
        {:else if deleteResult.deleted === 0}
          Failed to delete files
        {:else}
          Deleted {deleteResult.deleted} files, {deleteResult.failed} failed
        {/if}
      </div>
    {/if}
  </div>
{/if}

{#if showConfirmDialog}
  <ConfirmDialog
    filePaths={getSelectedPaths()}
    {useTrash}
    onConfirm={confirmDelete}
    onCancel={cancelDelete}
  />
{/if}

<style>
  .delete-controls {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
  }

  .selection-info {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .count {
    font-weight: 600;
    color: var(--accent);
  }

  .size {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .options {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }

  .trash-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .trash-toggle input {
    accent-color: var(--accent);
  }

  .warning {
    color: var(--error);
    font-size: 0.875rem;
    font-weight: 500;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-clear {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .btn-clear:hover:not(:disabled) {
    background: var(--border);
  }

  .btn-delete {
    background: var(--error);
    color: white;
  }

  .btn-delete:hover:not(:disabled) {
    background: #dc2626;
  }

  .result {
    width: 100%;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.875rem;
    background: rgba(239, 68, 68, 0.1);
    color: var(--error);
  }

  .result.success {
    background: rgba(74, 222, 128, 0.1);
    color: var(--success);
  }
</style>
