<script lang="ts">
  import { folderStore } from '../stores/folderStore';
  import { selectFolders } from '../api/tauri';

  let loading = false;
  let error: string | null = null;

  async function handleAddFolder() {
    loading = true;
    error = null;

    try {
      const paths = await selectFolders();
      if (paths.length > 0) {
        folderStore.addFolders(paths);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to select folders';
    } finally {
      loading = false;
    }
  }

  function handleRemoveFolder(path: string) {
    folderStore.removeFolder(path);
  }

  function handleClearAll() {
    folderStore.clearFolders();
  }
</script>

<div class="folder-selector">
  <div class="header">
    <h3>Folders to Scan</h3>
    <div class="actions">
      <button
        class="btn btn-primary"
        onclick={handleAddFolder}
        disabled={loading}
      >
        {loading ? 'Selecting...' : 'Add Folder'}
      </button>
      {#if $folderStore.folders.length > 0}
        <button class="btn btn-secondary" onclick={handleClearAll}>
          Clear All
        </button>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <div class="folder-list">
    {#if $folderStore.folders.length === 0}
      <p class="empty-state">No folders selected. Click "Add Folder" to start.</p>
    {:else}
      {#each $folderStore.folders as folder}
        <div class="folder-item">
          <span class="folder-path" title={folder}>{folder}</span>
          <button
            class="btn-icon"
            onclick={() => handleRemoveFolder(folder)}
            title="Remove folder"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .folder-selector {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .header h3 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary);
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
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--accent);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover:not(:disabled) {
    border-color: var(--border-hover);
    background: var(--bg-secondary);
  }

  .error-message {
    background: var(--error-muted);
    color: var(--error);
    padding: 0.625rem 1rem;
    border-radius: var(--radius);
    margin-bottom: 1rem;
    font-size: 0.8125rem;
  }

  .folder-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .empty-state {
    color: var(--text-muted);
    text-align: center;
    padding: 2rem;
    font-size: 0.875rem;
  }

  .folder-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.875rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 0.5rem;
  }

  .folder-item:hover {
    border-color: var(--border-hover);
  }

  .folder-path {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .btn-icon {
    background: none;
    border: none;
    color: var(--text-muted);
    padding: 0.25rem;
    cursor: pointer;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .btn-icon svg {
    width: 16px;
    height: 16px;
  }

  .btn-icon:hover {
    color: var(--error);
    background: var(--error-muted);
  }
</style>
