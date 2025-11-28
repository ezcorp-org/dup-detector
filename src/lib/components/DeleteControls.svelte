<script lang="ts">
  import {
    scanStore,
    hasSelection,
    selectedFilesCount,
    selectedFilesSize,
    hasResults,
    totalWastedSpace,
  } from '../stores/scanStore';
  import { deleteFiles } from '../api/tauri';
  import { formatBytes, pluralize } from '../utils/format';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let useTrash = true;
  let showConfirmDialog = false;
  let showDeleteAllDialog = false;
  let deleting = false;
  let deleteResult: { deleted: number; failed: number } | null = null;

  async function handleDelete() {
    showConfirmDialog = true;
  }

  function handleDeleteAllDuplicates() {
    // First select all duplicates, then show confirm dialog
    scanStore.selectAllDuplicates();
    showDeleteAllDialog = true;
  }

  async function confirmDelete() {
    showConfirmDialog = false;
    showDeleteAllDialog = false;
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

  function cancelDeleteAll() {
    showDeleteAllDialog = false;
    scanStore.clearAllSelections();
  }

  function getSelectedPaths(): string[] {
    return Array.from($scanStore.selectedForDeletion);
  }
</script>

{#if $hasResults || $hasSelection || deleteResult}
  <div class="delete-controls">
    {#if $hasSelection}
      <div class="selection-info">
        <span class="count">
          {pluralize($selectedFilesCount, 'file')} selected
        </span>
        <span class="size">({formatBytes($selectedFilesSize)})</span>
      </div>
    {:else if $hasResults}
      <div class="selection-info">
        <span class="hint">Select files to delete or use "Delete All Duplicates"</span>
      </div>
    {/if}

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
      {#if $hasSelection}
        <button
          class="btn btn-secondary"
          onclick={() => scanStore.clearAllSelections()}
          disabled={deleting}
        >
          Clear Selection
        </button>
        <button
          class="btn btn-danger"
          onclick={handleDelete}
          disabled={!$hasSelection || deleting}
        >
          {#if deleting}
            Deleting...
          {:else}
            Delete Selected
          {/if}
        </button>
      {/if}
      {#if $hasResults}
        <button
          class="btn btn-warning"
          onclick={handleDeleteAllDuplicates}
          disabled={deleting}
          title="Select and delete all duplicate files (keeps one copy of each)"
        >
          {#if deleting}
            Deleting...
          {:else}
            Delete All Duplicates ({formatBytes($totalWastedSpace)})
          {/if}
        </button>
      {/if}
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

{#if showDeleteAllDialog}
  <ConfirmDialog
    filePaths={getSelectedPaths()}
    {useTrash}
    onConfirm={confirmDelete}
    onCancel={cancelDeleteAll}
  />
{/if}

<style>
  .delete-controls {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.25rem;
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
    font-size: 0.875rem;
  }

  .size {
    color: var(--text-secondary);
    font-size: 0.8125rem;
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
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .trash-toggle input {
    accent-color: var(--accent);
  }

  .warning {
    color: var(--error);
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    border: none;
    font-weight: 500;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover:not(:disabled) {
    border-color: var(--border-hover);
  }

  .btn-danger {
    background: var(--error);
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #dc2626;
  }

  .btn-warning {
    background: var(--warning);
    color: var(--bg-primary);
    font-weight: 600;
  }

  .btn-warning:hover:not(:disabled) {
    background: #f59e0b;
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.8125rem;
  }

  .result {
    width: 100%;
    padding: 0.625rem 1rem;
    border-radius: var(--radius);
    font-size: 0.8125rem;
    background: var(--error-muted);
    color: var(--error);
  }

  .result.success {
    background: var(--success-muted);
    color: var(--success);
  }
</style>
