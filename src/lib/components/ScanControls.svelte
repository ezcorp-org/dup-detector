<script lang="ts">
  import { folderStore, hasFolders, scanOptions } from '../stores/folderStore';
  import { scanStore, isScanning } from '../stores/scanStore';
  import { startScan, cancelScan, setupScanListeners } from '../api/tauri';
  import { onMount, onDestroy } from 'svelte';
  import type { ScanProgress, ScanResult } from '../types';

  let unlisten: (() => void) | null = null;
  let showAdvanced = false;
  let cancelling = false;

  function toggleAdvanced() {
    showAdvanced = !showAdvanced;
  }

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
    cancelling = false;
    scanStore.finishScan(result);
  }

  function handleError(error: string) {
    cancelling = false;
    scanStore.setError(error);
  }

  function handleCancelled() {
    cancelling = false;
    scanStore.cancelScan();
  }

  async function handleStartScan() {
    cancelling = false;
    scanStore.startScan();

    try {
      const options = $scanOptions;
      await startScan(options);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // Check if it was a cancellation
      if (message.includes('Cancelled')) {
        scanStore.cancelScan();
      } else {
        scanStore.setError(message);
      }
      cancelling = false;
    }
  }

  async function handleCancelScan() {
    if (cancelling) return; // Prevent multiple cancel requests

    cancelling = true;
    try {
      await cancelScan();
      // The backend will emit a cancelled event which calls handleCancelled
    } catch (e) {
      console.error('Failed to cancel scan:', e);
      cancelling = false;
    }
  }
</script>

<div class="scan-controls">
  <div class="advanced-section">
    <button class="advanced-toggle" onclick={toggleAdvanced} disabled={$isScanning}>
      <span class="toggle-icon">{showAdvanced ? '▼' : '▶'}</span>
      <svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
      </svg>
      <span class="toggle-label">Advanced Filtering</span>
      {#if $folderStore.minFileSize || $folderStore.includeExtensions || $folderStore.excludeExtensions || $folderStore.followSymlinks}
        <span class="active-badge">Active</span>
      {/if}
    </button>

    {#if showAdvanced}
      <div class="filters">
        <div class="filter-group">
          <label for="min-size">Min File Size</label>
          <div class="size-input">
            <input
              type="number"
              id="min-size"
              min="0"
              placeholder="0"
              value={$folderStore.minFileSize ?? ''}
              oninput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                folderStore.setMinFileSize(val ? parseInt(val, 10) : null);
              }}
              disabled={$isScanning}
            />
            <select
              value={$folderStore.sizeUnit}
              onchange={(e) => folderStore.setSizeUnit((e.target as HTMLSelectElement).value as 'KB' | 'MB')}
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
              checked={$folderStore.followSymlinks}
              onchange={() => folderStore.setFollowSymlinks(!$folderStore.followSymlinks)}
              disabled={$isScanning}
            />
            Follow Symlinks
          </label>
        </div>
      </div>
    {/if}
  </div>

  <div class="actions">
    {#if $isScanning}
      <button
        class="btn btn-danger"
        onclick={handleCancelScan}
        disabled={cancelling}
      >
        {#if cancelling}
          <span class="spinner"></span>
          Cancelling...
        {:else}
          Cancel Scan
        {/if}
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
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }

  .advanced-section {
    margin-bottom: 1.25rem;
  }

  .advanced-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .advanced-toggle:hover:not(:disabled) {
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .advanced-toggle:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-icon {
    font-size: 0.625rem;
    color: var(--text-muted);
  }

  .filter-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .toggle-label {
    flex: 1;
    text-align: left;
  }

  .active-badge {
    background: var(--accent-muted);
    color: var(--accent);
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.6875rem;
    font-weight: 600;
  }

  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    padding: 1rem;
    margin-top: 0.5rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
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
    font-size: 0.8125rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-group input[type="text"],
  .filter-group input[type="number"] {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.5rem 0.75rem;
    color: var(--text-primary);
    font-size: 0.8125rem;
    transition: border-color 0.2s;
  }

  .filter-group input[type="text"]:focus,
  .filter-group input[type="number"]:focus {
    border-color: var(--accent);
    outline: none;
  }

  .filter-group input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .filter-group select {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.5rem 0.75rem;
    color: var(--text-primary);
    font-size: 0.8125rem;
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

  .btn-primary {
    background: var(--accent);
    color: white;
    box-shadow: 0 4px 12px var(--shadow-accent);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-large {
    padding: 0.75rem 2rem;
    font-size: 0.875rem;
  }

  .btn-danger {
    background: var(--error);
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #dc2626;
  }

  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 0.5rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  input[type="radio"],
  input[type="checkbox"] {
    accent-color: var(--accent);
  }
</style>
