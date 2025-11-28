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
      <span class="stat">
        <strong>{$groupCount}</strong>
        {pluralize($groupCount, 'group', 'groups').split(' ')[1]}
      </span>
      <span class="stat">
        <strong>{$totalDuplicateFiles}</strong> duplicate files
      </span>
      <span class="stat wasted">
        <strong>{formatBytes($totalWastedSpace)}</strong> wasted
      </span>
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
                        🗑
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
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1rem;
  }

  .summary {
    display: flex;
    gap: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1rem;
  }

  .stat {
    color: var(--text-secondary);
  }

  .stat strong {
    color: var(--text-primary);
    font-size: 1.125rem;
  }

  .stat.wasted strong {
    color: var(--warning);
  }

  .groups-list {
    max-height: 500px;
    overflow-y: auto;
  }

  .group {
    border: 1px solid var(--border);
    border-radius: 4px;
    margin-bottom: 0.5rem;
    overflow: hidden;
  }

  .group.expanded {
    border-color: var(--accent);
  }

  .group-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--bg-tertiary);
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .group-header:hover {
    background: var(--border);
  }

  .expand-icon {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .hash {
    font-family: monospace;
    color: var(--text-secondary);
  }

  .size {
    font-weight: 500;
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
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
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
    border-radius: 4px;
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-small {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .btn:not(.btn-secondary) {
    background: var(--accent);
    color: white;
  }

  .btn:not(.btn-secondary):hover {
    background: var(--accent-hover);
  }

  .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background: var(--border);
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .file-item-wrapper {
    background: var(--bg-secondary);
    border-radius: 4px;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .file-item-wrapper:hover {
    background: var(--bg-tertiary);
  }

  .file-item-wrapper.selected {
    background: rgba(233, 69, 96, 0.1);
    border: 1px solid var(--accent);
  }

  .file-item-wrapper.first {
    border-left: 3px solid var(--success);
  }

  .file-item-wrapper.expanded {
    border-color: var(--accent);
  }

  .file-item-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
  }

  .file-expand-icon {
    color: var(--text-secondary);
    font-size: 0.625rem;
    width: 12px;
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
  }

  .file-path {
    display: block;
    font-size: 0.75rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .keep-badge {
    background: var(--success);
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    flex-shrink: 0;
  }

  .btn-delete-file {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    opacity: 0.6;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .btn-delete-file:hover:not(:disabled) {
    opacity: 1;
    background: rgba(239, 68, 68, 0.2);
  }

  .btn-delete-file:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .file-details {
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    background: var(--bg-tertiary);
    border-top: 1px solid var(--border);
  }

  .detail-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
    font-size: 0.8125rem;
  }

  .detail-row:last-child {
    margin-bottom: 0;
  }

  .detail-label {
    color: var(--text-secondary);
    flex-shrink: 0;
    min-width: 80px;
  }

  .detail-value {
    color: var(--text-primary);
  }

  .detail-value.path {
    font-family: monospace;
    font-size: 0.75rem;
    word-break: break-all;
  }

  .no-results {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
  }

  .no-results h3 {
    color: var(--success);
    margin-bottom: 0.5rem;
  }
</style>
