<script lang="ts">
  import { scanStore, hasErrors } from '../stores/scanStore';
  import { pluralize } from '../utils/format';

  let expanded = false;

  function toggle() {
    expanded = !expanded;
  }

  function dismiss() {
    scanStore.dismissErrors();
  }
</script>

{#if $hasErrors}
  <div class="error-panel">
    <button class="header" onclick={toggle}>
      <span class="icon">{expanded ? '▼' : '▶'}</span>
      <div class="header-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <span class="title">
        {pluralize($scanStore.errors.length, 'problem')} encountered
      </span>
      <span class="badge">{$scanStore.errors.length}</span>
    </button>

    {#if expanded}
      <div class="content">
        <div class="error-list">
          {#each $scanStore.errors as error}
            <div class="error-item">
              <span class="path" title={error.path}>{error.path}</span>
              <span class="message">{error.message}</span>
            </div>
          {/each}
        </div>
        <button class="btn-dismiss" onclick={dismiss}>
          Dismiss
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .error-panel {
    background: var(--warning-muted);
    border: 1px solid var(--warning);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--warning);
    text-align: left;
    transition: background-color 0.2s;
  }

  .header:hover {
    background: rgba(251, 191, 36, 0.1);
  }

  .icon {
    font-size: 0.625rem;
    color: var(--warning);
  }

  .header-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .header-icon svg {
    width: 100%;
    height: 100%;
  }

  .title {
    flex: 1;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .badge {
    background: var(--warning);
    color: var(--bg-primary);
    padding: 0.125rem 0.625rem;
    border-radius: 12px;
    font-size: 0.6875rem;
    font-weight: 600;
  }

  .content {
    padding: 0 1rem 1rem 1rem;
  }

  .error-list {
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 1rem;
  }

  .error-item {
    padding: 0.625rem 0.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 0.5rem;
  }

  .path {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6875rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 0.25rem;
  }

  .message {
    display: block;
    font-size: 0.8125rem;
    color: var(--text-primary);
  }

  .btn-dismiss {
    padding: 0.5rem 1rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-primary);
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-dismiss:hover {
    border-color: var(--border-hover);
  }
</style>
