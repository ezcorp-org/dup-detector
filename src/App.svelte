<script lang="ts">
  import FolderSelector from './lib/components/FolderSelector.svelte';
  import ScanControls from './lib/components/ScanControls.svelte';
  import ProgressBar from './lib/components/ProgressBar.svelte';
  import DuplicateGroups from './lib/components/DuplicateGroups.svelte';
  import DeleteControls from './lib/components/DeleteControls.svelte';
  import ErrorPanel from './lib/components/ErrorPanel.svelte';
  import { scanStore, isScanning, hasResults } from './lib/stores/scanStore';
  import { formatDuration, formatBytes, pluralize } from './lib/utils/format';

  $: statusText = getStatusText($scanStore.status);

  function getStatusText(status: string): string {
    switch (status) {
      case 'idle':
        return 'Ready';
      case 'scanning':
        return 'Scanning...';
      case 'finished':
        return `Completed in ${formatDuration($scanStore.durationMs)}`;
      case 'cancelled':
        return 'Cancelled';
      case 'error':
        return 'Error occurred';
      default:
        return 'Ready';
    }
  }
</script>

<main>
  <header>
    <h1>Duplicate File Detector</h1>
    <p class="subtitle">Find and remove duplicate files to free up space</p>
  </header>

  <section class="content">
    <div class="panel-group">
      <FolderSelector />
      <ScanControls />
    </div>

    <ProgressBar />

    <ErrorPanel />

    {#if $hasResults || $scanStore.status === 'finished'}
      <DeleteControls />
      <DuplicateGroups />
    {/if}

    {#if $scanStore.status === 'error' && $scanStore.errorMessage}
      <div class="error-message">
        <h3>Scan Error</h3>
        <p>{$scanStore.errorMessage}</p>
        <button class="btn" onclick={() => scanStore.reset()}>
          Try Again
        </button>
      </div>
    {/if}

    {#if $scanStore.status === 'cancelled'}
      <div class="cancelled-message">
        <h3>Scan Cancelled</h3>
        <p>The scan was cancelled before completion.</p>
        <button class="btn" onclick={() => scanStore.reset()}>
          Start New Scan
        </button>
      </div>
    {/if}
  </section>

  <footer>
    <span class="status">{statusText}</span>
    {#if $scanStore.status === 'finished'}
      <span class="stats">
        {pluralize($scanStore.totalFilesScanned, 'file')} scanned
        {#if $scanStore.duplicateGroups.length > 0}
          &middot; {pluralize($scanStore.duplicateGroups.length, 'duplicate group')}
        {/if}
      </span>
    {/if}
  </footer>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
  }

  header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  .subtitle {
    margin: 0.25rem 0 0 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .panel-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 900px) {
    .panel-group {
      grid-template-columns: 1fr;
    }
  }

  .error-message,
  .cancelled-message {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
  }

  .error-message {
    border: 1px solid var(--error);
  }

  .error-message h3 {
    color: var(--error);
    margin-bottom: 0.5rem;
  }

  .cancelled-message {
    border: 1px solid var(--warning);
  }

  .cancelled-message h3 {
    color: var(--warning);
    margin-bottom: 0.5rem;
  }

  .error-message p,
  .cancelled-message p {
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }

  .btn {
    padding: 0.5rem 1.5rem;
    border-radius: 4px;
    border: none;
    background: var(--accent);
    color: white;
    font-weight: 500;
    cursor: pointer;
  }

  .btn:hover {
    background: var(--accent-hover);
  }

  footer {
    padding: 0.75rem 1.5rem;
    border-top: 1px solid var(--border);
    background: var(--bg-secondary);
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
  }

  .status {
    color: var(--text-primary);
    font-weight: 500;
  }

  .stats {
    color: var(--text-secondary);
  }
</style>
