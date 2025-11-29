<script lang="ts">
  import FolderSelector from './lib/components/FolderSelector.svelte';
  import ScanControls from './lib/components/ScanControls.svelte';
  import ProgressBar from './lib/components/ProgressBar.svelte';
  import DuplicateGroups from './lib/components/DuplicateGroups.svelte';
  import DeleteControls from './lib/components/DeleteControls.svelte';
  import ErrorPanel from './lib/components/ErrorPanel.svelte';
  import { scanStore, hasResults } from './lib/stores/scanStore';
  import { formatDuration, pluralize } from './lib/utils/format';

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
    <div class="header-content">
      <div class="logo">
        <svg viewBox="0 0 32 32" fill="none" class="logo-icon">
          <defs>
            <linearGradient id="header-bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#c084fc"/>
              <stop offset="50%" style="stop-color:#a855f7"/>
              <stop offset="100%" style="stop-color:#7c3aed"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="32" height="32" rx="6" fill="url(#header-bg-gradient)"/>
          <g opacity="0.6">
            <path d="M7 7h8l4 4v10a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 017 21V8.5A1.5 1.5 0 018.5 7z" fill="#ffffff"/>
            <path d="M15 7v3a1 1 0 001 1h3" fill="#ffffff" opacity="0.8"/>
          </g>
          <g>
            <path d="M12 10h8l4 4v10a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 0112 24V11.5a1.5 1.5 0 011.5-1.5z" fill="#ffffff"/>
            <path d="M20 10v3a1 1 0 001 1h3" fill="#ffffff" opacity="0.7"/>
            <rect x="14" y="17" width="7" height="1" rx="0.5" fill="#a855f7" opacity="0.4"/>
            <rect x="14" y="19.5" width="5" height="1" rx="0.5" fill="#a855f7" opacity="0.4"/>
            <rect x="14" y="22" width="6" height="1" rx="0.5" fill="#a855f7" opacity="0.4"/>
          </g>
        </svg>
        <div class="logo-text">
          <h1>Dup Detector</h1>
          <p class="subtitle">Find and remove duplicate files</p>
        </div>
      </div>
    </div>
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
      <div class="message-card error">
        <div class="message-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h3>Scan Error</h3>
        <p>{$scanStore.errorMessage}</p>
        <button class="btn btn-primary" onclick={() => scanStore.reset()}>
          Try Again
        </button>
      </div>
    {/if}

    {#if $scanStore.status === 'cancelled'}
      <div class="message-card warning">
        <div class="message-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3>Scan Cancelled</h3>
        <p>The scan was cancelled before completion.</p>
        <button class="btn btn-primary" onclick={() => scanStore.reset()}>
          Start New Scan
        </button>
      </div>
    {/if}
  </section>

  <footer>
    <div class="footer-status">
      <span class="status">{statusText}</span>
      {#if $scanStore.status === 'finished'}
        <span class="stats">
          {pluralize($scanStore.totalFilesScanned, 'file')} scanned
          {#if $scanStore.duplicateGroups.length > 0}
            &middot; {pluralize($scanStore.duplicateGroups.length, 'duplicate group')}
          {/if}
        </span>
      {/if}
    </div>
    <div class="footer-brand">
      <span class="copyright">&copy; 2025 <a href="https://ezcorp.org" target="_blank" rel="noopener noreferrer">EZCorp</a>. Privacy first. Always.</span>
      <span class="tagline">Built with ❤️ for developers who value the EZ life.</span>
    </div>
  </footer>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary);
  }

  header {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logo-icon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
  }

  .logo-text h1 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.025em;
  }

  .subtitle {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.8125rem;
  }

  .content {
    flex: 1;
    padding: 1.25rem;
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

  .message-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2.5rem;
    text-align: center;
  }

  .message-card.error {
    border-color: var(--error);
    background: var(--error-muted);
  }

  .message-card.warning {
    border-color: var(--warning);
    background: var(--warning-muted);
  }

  .message-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 1rem;
    padding: 0.75rem;
    border-radius: 50%;
    background: var(--bg-elevated);
  }

  .message-card.error .message-icon {
    color: var(--error);
    background: var(--error-muted);
  }

  .message-card.warning .message-icon {
    color: var(--warning);
    background: var(--warning-muted);
  }

  .message-icon svg {
    width: 100%;
    height: 100%;
  }

  .message-card h3 {
    margin-bottom: 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .message-card.error h3 {
    color: var(--error);
  }

  .message-card.warning h3 {
    color: var(--warning);
  }

  .message-card p {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }

  .btn {
    padding: 0.625rem 1.5rem;
    border-radius: var(--radius);
    border: none;
    font-weight: 500;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--accent);
    color: white;
    box-shadow: 0 4px 12px var(--shadow-accent);
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  footer {
    padding: 0.75rem 1.5rem;
    border-top: 1px solid var(--border);
    background: var(--bg-secondary);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8125rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .footer-status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .status {
    color: var(--text-primary);
    font-weight: 500;
  }

  .stats {
    color: var(--text-secondary);
  }

  .footer-brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .footer-brand a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }

  .footer-brand a:hover {
    text-decoration: underline;
  }

  .tagline {
    opacity: 0.8;
  }

  @media (max-width: 700px) {
    footer {
      flex-direction: column;
      align-items: flex-start;
    }

    .footer-brand {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }
</style>
