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
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_interactive_supports_focus -->
  <div class="dialog" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
    <div class="dialog-icon" class:danger={!useTrash}>
      {#if useTrash}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      {/if}
    </div>

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
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    max-width: 480px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .dialog-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 1rem;
    padding: 0.75rem;
    border-radius: 50%;
    background: var(--accent-muted);
    color: var(--accent);
  }

  .dialog-icon.danger {
    background: var(--error-muted);
    color: var(--error);
  }

  .dialog-icon svg {
    width: 100%;
    height: 100%;
  }

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    text-align: center;
    color: var(--text-primary);
  }

  .danger-warning {
    background: var(--error-muted);
    border: 1px solid var(--error);
    color: var(--error);
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    margin-bottom: 1rem;
    font-size: 0.8125rem;
  }

  p {
    margin-bottom: 1rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
    text-align: center;
  }

  .file-list {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 1.5rem;
  }

  .file-item {
    padding: 0.375rem 0.625rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
  }

  .more {
    padding: 0.375rem 0.625rem;
    color: var(--text-muted);
    font-size: 0.75rem;
    font-style: italic;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .btn {
    padding: 0.625rem 1.25rem;
    border-radius: var(--radius);
    border: none;
    font-weight: 500;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover {
    border-color: var(--border-hover);
  }

  .btn-danger {
    background: var(--error);
    color: white;
  }

  .btn-danger:hover {
    background: #dc2626;
  }
</style>
