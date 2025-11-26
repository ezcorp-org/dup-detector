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
            &times;
          </button>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .folder-selector {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
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
    transition: background-color 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
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
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--border);
  }

  .error-message {
    background: rgba(239, 68, 68, 0.1);
    color: var(--error);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .folder-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .empty-state {
    color: var(--text-secondary);
    text-align: center;
    padding: 2rem;
    font-style: italic;
  }

  .folder-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: var(--bg-tertiary);
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }

  .folder-path {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
    font-size: 0.875rem;
  }

  .btn-icon {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.25rem;
    line-height: 1;
    padding: 0.25rem;
    cursor: pointer;
    border-radius: 4px;
  }

  .btn-icon:hover {
    color: var(--error);
    background: rgba(239, 68, 68, 0.1);
  }
</style>
