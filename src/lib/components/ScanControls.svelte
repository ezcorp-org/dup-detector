<script lang="ts">
  import { folderStore, hasFolders, scanOptions } from '../stores/folderStore';
  import { scanStore, isScanning } from '../stores/scanStore';
  import { startScan, cancelScan, setupScanListeners } from '../api/tauri';
  import { onMount, onDestroy } from 'svelte';
  import type { ScanProgress, ScanResult } from '../types';

  let unlisten: (() => void) | null = null;

  onMount(async () => {
    unlisten = await setupScanListeners({
      onProgress: handleProgress,
      onFinished: handleFinished,
      onError: handleError,
      onCancelled: handleCancelled,
    });
  });

  onDestroy(() => {
    if (unlisten) {
      unlisten();
    }
  });

  function handleProgress(progress: ScanProgress) {
    scanStore.updateProgress(progress);
  }

  function handleFinished(result: ScanResult) {
    scanStore.finishScan(result);
  }

  function handleError(error: string) {
    scanStore.setError(error);
  }

  function handleCancelled() {
    scanStore.cancelScan();
  }

  async function handleStartScan() {
    scanStore.startScan();

    try {
      const options = $scanOptions;
      await startScan(options);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      scanStore.setError(message);
    }
  }

  async function handleCancelScan() {
    try {
      await cancelScan();
    } catch (e) {
      console.error('Failed to cancel scan:', e);
    }
  }
</script>

<div class="scan-controls">
  <div class="filters">
    <div class="filter-group">
      <label for="min-size">Min File Size</label>
      <div class="size-input">
        <input
          type="number"
          id="min-size"
          min="0"
          placeholder="0"
          bind:value={$folderStore.minFileSize}
          disabled={$isScanning}
        />
        <select
          bind:value={$folderStore.sizeUnit}
          disabled={$isScanning}
        >
          <option value="KB">KB</option>
          <option value="MB">MB</option>
        </select>
      </div>
    </div>

    <div class="filter-group">
      <label>
        <input
          type="radio"
          name="extension-mode"
          checked={$folderStore.useIncludeMode}
          onchange={() => folderStore.setUseIncludeMode(true)}
          disabled={$isScanning}
        />
        Include Extensions
      </label>
      <input
        type="text"
        placeholder="jpg, png, gif"
        value={$folderStore.includeExtensions}
        oninput={(e) => folderStore.setIncludeExtensions((e.target as HTMLInputElement).value)}
        disabled={$isScanning || !$folderStore.useIncludeMode}
      />
    </div>

    <div class="filter-group">
      <label>
        <input
          type="radio"
          name="extension-mode"
          checked={!$folderStore.useIncludeMode}
          onchange={() => folderStore.setUseIncludeMode(false)}
          disabled={$isScanning}
        />
        Exclude Extensions
      </label>
      <input
        type="text"
        placeholder="tmp, bak, log"
        value={$folderStore.excludeExtensions}
        oninput={(e) => folderStore.setExcludeExtensions((e.target as HTMLInputElement).value)}
        disabled={$isScanning || $folderStore.useIncludeMode}
      />
    </div>

    <div class="filter-group checkbox">
      <label>
        <input
          type="checkbox"
          bind:checked={$folderStore.followSymlinks}
          disabled={$isScanning}
        />
        Follow Symlinks
      </label>
    </div>
  </div>

  <div class="actions">
    {#if $isScanning}
      <button class="btn btn-danger" onclick={handleCancelScan}>
        Cancel Scan
      </button>
    {:else}
      <button
        class="btn btn-primary btn-large"
        onclick={handleStartScan}
        disabled={!$hasFolders}
      >
        Start Scan
      </button>
    {/if}
  </div>
</div>

<style>
  .scan-controls {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1rem;
  }

  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-group.checkbox {
    justify-content: flex-end;
  }

  .filter-group label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-group input[type="text"],
  .filter-group input[type="number"] {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.5rem;
    color: var(--text-primary);
  }

  .filter-group input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .filter-group select {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.5rem;
    color: var(--text-primary);
  }

  .size-input {
    display: flex;
    gap: 0.5rem;
  }

  .size-input input {
    flex: 1;
  }

  .size-input select {
    width: 70px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
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

  .btn-primary {
    background: var(--accent);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-large {
    padding: 0.75rem 2rem;
    font-size: 1rem;
  }

  .btn-danger {
    background: var(--error);
    color: white;
  }

  .btn-danger:hover {
    background: #dc2626;
  }

  input[type="radio"],
  input[type="checkbox"] {
    accent-color: var(--accent);
  }
</style>
