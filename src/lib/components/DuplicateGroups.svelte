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
  import type { DuplicateGroup } from '../types';

  // Track expanded groups
  let expandedGroups: Set<string> = new Set();

  function toggleGroup(hash: string) {
    if (expandedGroups.has(hash)) {
      expandedGroups.delete(hash);
    } else {
      expandedGroups.add(hash);
    }
    expandedGroups = expandedGroups; // Trigger reactivity
  }

  function isExpanded(hash: string): boolean {
    return expandedGroups.has(hash);
  }

  function isFileSelected(path: string): boolean {
    return $scanStore.selectedForDeletion.has(path);
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
        {@const expanded = isExpanded(group.hash)}
        {@const selectedCount = getGroupSelectedCount(group)}
        {@const wastedSpace = calculateWastedSpace(group)}

        <div class="group" class:expanded>
          <button class="group-header" onclick={() => toggleGroup(group.hash)}>
            <span class="expand-icon">{expanded ? '▼' : '▶'}</span>
            <span class="hash" title={group.hash}>{truncateHash(group.hash)}</span>
            <span class="size">{formatBytes(group.size)}</span>
            <span class="count">{group.files.length} files</span>
            <span class="wasted">{formatBytes(wastedSpace)} wasted</span>
            {#if selectedCount > 0}
              <span class="selected-badge">{selectedCount} selected</span>
            {/if}
          </button>

          {#if expanded}
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
                  {@const selected = isFileSelected(file.path)}
                  <label class="file-item" class:selected class:first={index === 0}>
                    <input
                      type="checkbox"
                      checked={selected}
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
                  </label>
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

  .file-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-secondary);
    border-radius: 4px;
    cursor: pointer;
  }

  .file-item:hover {
    background: var(--bg-tertiary);
  }

  .file-item.selected {
    background: rgba(233, 69, 96, 0.1);
    border: 1px solid var(--accent);
  }

  .file-item.first {
    border-left: 3px solid var(--success);
  }

  .file-item input[type="checkbox"] {
    accent-color: var(--accent);
    width: 16px;
    height: 16px;
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
