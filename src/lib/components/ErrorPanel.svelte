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
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid var(--warning);
    border-radius: 8px;
    overflow: hidden;
  }

  .header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--warning);
    text-align: left;
  }

  .header:hover {
    background: rgba(251, 191, 36, 0.05);
  }

  .icon {
    font-size: 0.75rem;
  }

  .title {
    flex: 1;
    font-weight: 500;
  }

  .badge {
    background: var(--warning);
    color: var(--bg-primary);
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
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
    padding: 0.5rem;
    background: var(--bg-secondary);
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }

  .path {
    display: block;
    font-family: monospace;
    font-size: 0.75rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .message {
    display: block;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .btn-dismiss {
    padding: 0.375rem 0.75rem;
    background: var(--bg-tertiary);
    border: none;
    border-radius: 4px;
    color: var(--text-primary);
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-dismiss:hover {
    background: var(--border);
  }
</style>
