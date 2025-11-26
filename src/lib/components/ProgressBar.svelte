<script lang="ts">
  import { scanStore, isScanning } from '../stores/scanStore';
  import { formatNumber } from '../utils/format';

  $: progress = $scanStore.progress;
  $: percentage = progress.filesTotal
    ? Math.round((progress.filesScanned / progress.filesTotal) * 100)
    : null;

  $: phaseLabel = getPhaseLabel(progress.currentPhase);

  function getPhaseLabel(phase: string): string {
    switch (phase) {
      case 'counting':
        return 'Scanning directories...';
      case 'grouping':
        return 'Grouping by file size...';
      case 'hashing':
        return 'Computing file hashes...';
      case 'finalizing':
        return 'Finding duplicates...';
      case 'complete':
        return 'Complete!';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Processing...';
    }
  }
</script>

{#if $isScanning}
  <div class="progress-container">
    <div class="progress-info">
      <span class="phase">{phaseLabel}</span>
      <span class="count">
        {formatNumber(progress.filesScanned)}
        {#if progress.filesTotal}
          / {formatNumber(progress.filesTotal)}
        {/if}
        files
      </span>
    </div>

    <div class="progress-bar">
      {#if percentage !== null}
        <div class="progress-fill" style="width: {percentage}%"></div>
      {:else}
        <div class="progress-fill indeterminate"></div>
      {/if}
    </div>

    {#if percentage !== null}
      <div class="percentage">{percentage}%</div>
    {/if}
  </div>
{/if}

<style>
  .progress-container {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1rem;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .phase {
    font-weight: 500;
  }

  .count {
    color: var(--text-secondary);
    font-family: monospace;
  }

  .progress-bar {
    height: 8px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-fill.indeterminate {
    width: 30%;
    animation: indeterminate 1.5s infinite ease-in-out;
  }

  @keyframes indeterminate {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(400%);
    }
  }

  .percentage {
    text-align: right;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
</style>
