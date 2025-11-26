<script lang="ts">
  import { getFileName } from '../utils/format';

  export let filePaths: string[];
  export let useTrash: boolean;
  export let onConfirm: () => void;
  export let onCancel: () => void;

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="overlay" onclick={onCancel} role="presentation">
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="dialog" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
    <h2>Confirm Deletion</h2>

    {#if !useTrash}
      <div class="danger-warning">
        <strong>Warning:</strong> These files will be permanently deleted
        and cannot be recovered!
      </div>
    {/if}

    <p>
      Are you sure you want to
      {useTrash ? 'move to trash' : 'permanently delete'}
      {filePaths.length} file{filePaths.length !== 1 ? 's' : ''}?
    </p>

    <div class="file-list">
      {#each filePaths.slice(0, 10) as path}
        <div class="file-item" title={path}>
          {getFileName(path)}
        </div>
      {/each}
      {#if filePaths.length > 10}
        <div class="more">
          ...and {filePaths.length - 10} more files
        </div>
      {/if}
    </div>

    <div class="actions">
      <button class="btn btn-secondary" onclick={onCancel}>
        Cancel
      </button>
      <button
        class="btn btn-danger"
        onclick={onConfirm}
      >
        {useTrash ? 'Move to Trash' : 'Delete Permanently'}
      </button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
  }

  .danger-warning {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--error);
    color: var(--error);
    padding: 0.75rem 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  p {
    margin-bottom: 1rem;
    color: var(--text-secondary);
  }

  .file-list {
    background: var(--bg-tertiary);
    border-radius: 4px;
    padding: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 1.5rem;
  }

  .file-item {
    padding: 0.375rem 0.5rem;
    font-family: monospace;
    font-size: 0.875rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .more {
    padding: 0.375rem 0.5rem;
    color: var(--text-secondary);
    font-style: italic;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
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

  .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background: var(--border);
  }

  .btn-danger {
    background: var(--error);
    color: white;
  }

  .btn-danger:hover {
    background: #dc2626;
  }
</style>
