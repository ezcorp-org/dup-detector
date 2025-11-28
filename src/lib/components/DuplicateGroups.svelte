<script lang="ts">
  import {
    scanStore,
    hasResults,
    totalWastedSpace,
    groupCount,
    totalDuplicateFiles,
  } from '../stores/scanStore';
  import {
    formatBytes,
    truncateHash,
    getFileName,
    getDirectory,
    pluralize,
  } from '../utils/format';
  import { deleteFiles } from '../api/tauri';
  import type { DuplicateGroup } from '../types';
  import ConfirmDialog from './ConfirmDialog.svelte';

  // Track expanded groups
  let expandedGroups: Set<string> = new Set();
  // Track expanded file items
  let expandedFiles: Set<string> = new Set();

  // Single file delete state
  let fileToDelete: string | null = null;
  let showDeleteDialog = false;
  let useTrash = true;
  let deleting = false;

  function toggleGroup(hash: string) {
    const newSet = new Set(expandedGroups);
    if (newSet.has(hash)) {
      newSet.delete(hash);
    } else {
      newSet.add(hash);
    }
    expandedGroups = newSet; // Trigger reactivity with new Set
  }

  function toggleFileExpand(path: string, event: MouseEvent) {
    // Don't toggle if clicking on checkbox or delete button
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }

    const newSet = new Set(expandedFiles);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    expandedFiles = newSet; // Trigger reactivity with new Set
  }

  function toggleFile(path: string) {
    scanStore.toggleFileSelection(path);
  }

  function selectAllButOne(group: DuplicateGroup) {
    scanStore.selectAllButOne(group);
  }

  function clearGroupSelection(group: DuplicateGroup) {
    scanStore.clearGroupSelection(group);
  }

  function getGroupSelectedCount(group: DuplicateGroup): number {
    return group.files.filter((f) =>
      $scanStore.selectedForDeletion.has(f.path)
    ).length;
  }

  function calculateWastedSpace(group: DuplicateGroup): number {
    return (group.files.length - 1) * group.size;
  }

  function formatDate(isoString: string | undefined): string {
    if (!isoString) return 'Unknown';
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return 'Unknown';
    }
  }

  function handleDeleteFile(path: string, event: MouseEvent) {
    event.stopPropagation();
    fileToDelete = path;
    showDeleteDialog = true;
  }

  async function confirmDeleteFile() {
    if (!fileToDelete) return;

    showDeleteDialog = false;
    deleting = true;

    try {
      const result = await deleteFiles([fileToDelete], useTrash);
      if (result.deleted.length > 0) {
        scanStore.removeDeletedFiles(result.deleted);
      }
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      deleting = false;
      fileToDelete = null;
    }
  }

  function cancelDeleteFile() {
    showDeleteDialog = false;
    fileToDelete = null;
  }
</script>

{#if $hasResults}
  <div class="duplicate-groups">
    <div class="summary">
      <div class="stat">
        <span class="stat-value">{$groupCount}</span>
        <span class="stat-label">{pluralize($groupCount, 'group', 'groups').split(' ')[1]}</span>
      </div>
      <div class="stat">
        <span class="stat-value">{$totalDuplicateFiles}</span>
        <span class="stat-label">duplicate files</span>
      </div>
      <div class="stat wasted">
        <span class="stat-value">{formatBytes($totalWastedSpace)}</span>
        <span class="stat-label">wasted</span>
      </div>
    </div>

    <div class="groups-list">
      {#each $scanStore.duplicateGroups as group (group.hash)}
        {@const selectedCount = getGroupSelectedCount(group)}
        {@const wastedSpace = calculateWastedSpace(group)}

        <div class="group" class:expanded={expandedGroups.has(group.hash)}>
          <button class="group-header" onclick={() => toggleGroup(group.hash)}>
            <span class="expand-icon">{expandedGroups.has(group.hash) ? '▼' : '▶'}</span>
            <span class="hash" title={group.hash}>{truncateHash(group.hash)}</span>
            <span class="size">{formatBytes(group.size)}</span>
            <span class="count">{group.files.length} files</span>
            <span class="wasted">{formatBytes(wastedSpace)} wasted</span>
            {#if selectedCount > 0}
              <span class="selected-badge">{selectedCount} selected</span>
            {/if}
          </button>

          {#if expandedGroups.has(group.hash)}
            <div class="group-content">
              <div class="group-actions">
                <button
                  class="btn btn-small"
                  onclick={() => selectAllButOne(group)}
                >
                  Select All But One
                </button>
                {#if selectedCount > 0}
                  <button
                    class="btn btn-small btn-secondary"
                    onclick={() => clearGroupSelection(group)}
                  >
                    Clear Selection
                  </button>
                {/if}
              </div>

              <div class="file-list">
                {#each group.files as file, index}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div
                    class="file-item-wrapper"
                    class:selected={$scanStore.selectedForDeletion.has(file.path)}
                    class:first={index === 0}
                    class:expanded={expandedFiles.has(file.path)}
                  >
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <div
                      class="file-item-header"
                      onclick={(e) => toggleFileExpand(file.path, e)}
                    >
                      <span class="file-expand-icon">{expandedFiles.has(file.path) ? '▼' : '▶'}</span>
                      <input
                        type="checkbox"
                        checked={$scanStore.selectedForDeletion.has(file.path)}
                        onchange={() => toggleFile(file.path)}
                      />
                      <div class="file-info">
                        <span class="file-name">{getFileName(file.path)}</span>
                        <span class="file-path" title={file.path}>
                          {getDirectory(file.path)}
                        </span>
                      </div>
                      {#if index === 0}
                        <span class="keep-badge">Keep</span>
                      {/if}
                      <button
                        class="btn-delete-file"
                        onclick={(e) => handleDeleteFile(file.path, e)}
                        title="Delete this file"
                        disabled={deleting}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                      </button>
                    </div>
                    {#if expandedFiles.has(file.path)}
                      <div class="file-details">
                        <div class="detail-row">
                          <span class="detail-label">Full Path:</span>
                          <span class="detail-value path">{file.path}</span>
                        </div>
                        <div class="detail-row">
                          <span class="detail-label">Size:</span>
                          <span class="detail-value">{formatBytes(file.size)}</span>
                        </div>
                        <div class="detail-row">
                          <span class="detail-label">Modified:</span>
                          <span class="detail-value">{formatDate(file.modified)}</span>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{:else if $scanStore.status === 'finished'}
  <div class="no-results">
    <div class="no-results-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    </div>
    <h3>No Duplicates Found</h3>
    <p>Great news! No duplicate files were found in the selected folders.</p>
  </div>
{/if}

{#if showDeleteDialog && fileToDelete}
  <ConfirmDialog
    filePaths={[fileToDelete]}
    {useTrash}
    onConfirm={confirmDeleteFile}
    onCancel={cancelDeleteFile}
  />
{/if}

<style>
  .duplicate-groups {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }

  .summary {
    display: flex;
    gap: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1rem;
  }

  .stat {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .stat-label {
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .stat.wasted .stat-value {
    color: var(--warning);
  }

  .groups-list {
    max-height: 500px;
    overflow-y: auto;
  }

  .group {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 0.5rem;
    overflow: hidden;
    transition: border-color 0.2s;
  }

  .group.expanded {
    border-color: var(--border-accent);
  }

  .group-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--bg-elevated);
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text-primary);
    font-size: 0.8125rem;
    transition: background-color 0.2s;
  }

  .group-header:hover {
    background: var(--bg-secondary);
  }

  .expand-icon {
    color: var(--text-muted);
    font-size: 0.625rem;
  }

  .hash {
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-muted);
  }

  .size {
    font-weight: 500;
    color: var(--text-primary);
  }

  .count {
    color: var(--text-secondary);
  }

  .wasted {
    color: var(--warning);
    margin-left: auto;
  }

  .selected-badge {
    background: var(--accent);
    color: white;
    padding: 0.125rem 0.625rem;
    border-radius: 12px;
    font-size: 0.6875rem;
    font-weight: 500;
  }

  .group-content {
    padding: 1rem;
    background: var(--bg-primary);
  }

  .group-actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
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

  .btn-small {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }

  .btn:not(.btn-secondary) {
    background: var(--accent);
    color: white;
  }

  .btn:not(.btn-secondary):hover {
    background: var(--accent-hover);
  }

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover {
    border-color: var(--border-hover);
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .file-item-wrapper {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .file-item-wrapper:hover {
    border-color: var(--border-hover);
  }

  .file-item-wrapper.selected {
    background: var(--accent-muted);
    border-color: var(--border-accent);
  }

  .file-item-wrapper.first {
    border-left: 3px solid var(--success);
  }

  .file-item-wrapper.expanded {
    border-color: var(--border-accent);
  }

  .file-item-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    cursor: pointer;
  }

  .file-expand-icon {
    color: var(--text-muted);
    font-size: 0.5rem;
    width: 10px;
    flex-shrink: 0;
  }

  .file-item-header input[type="checkbox"] {
    accent-color: var(--accent);
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .file-info {
    flex: 1;
    min-width: 0;
  }

  .file-name {
    display: block;
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .file-path {
    display: block;
    font-size: 0.6875rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .keep-badge {
    background: var(--success-muted);
    color: var(--success);
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.6875rem;
    font-weight: 500;
    flex-shrink: 0;
  }

  .btn-delete-file {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.375rem;
    border-radius: var(--radius-sm);
    opacity: 0.5;
    transition: all 0.2s;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }

  .btn-delete-file svg {
    width: 16px;
    height: 16px;
  }

  .btn-delete-file:hover:not(:disabled) {
    opacity: 1;
    background: var(--error-muted);
    color: var(--error);
  }

  .btn-delete-file:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .file-details {
    padding: 0.75rem 1rem 0.75rem 2.75rem;
    background: var(--bg-elevated);
    border-top: 1px solid var(--border);
  }

  .detail-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
    font-size: 0.75rem;
  }

  .detail-row:last-child {
    margin-bottom: 0;
  }

  .detail-label {
    color: var(--text-muted);
    flex-shrink: 0;
    min-width: 70px;
  }

  .detail-value {
    color: var(--text-secondary);
  }

  .detail-value.path {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6875rem;
    word-break: break-all;
  }

  .no-results {
    text-align: center;
    padding: 3rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }

  .no-results-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 1rem;
    color: var(--success);
  }

  .no-results-icon svg {
    width: 100%;
    height: 100%;
  }

  .no-results h3 {
    color: var(--success);
    margin-bottom: 0.5rem;
    font-size: 1.125rem;
  }

  .no-results p {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
</style>
