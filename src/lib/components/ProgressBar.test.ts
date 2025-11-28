import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ProgressBar from './ProgressBar.svelte';
import { scanStore } from '../stores/scanStore';

describe('ProgressBar', () => {
  beforeEach(() => {
    scanStore.reset();
  });

  it('should not render when not scanning', () => {
    render(ProgressBar);
    expect(screen.queryByText('files')).not.toBeInTheDocument();
  });

  it('should render when scanning', () => {
    scanStore.startScan();
    render(ProgressBar);
    expect(screen.getByText(/files/)).toBeInTheDocument();
  });

  it('should show counting phase label', () => {
    scanStore.startScan();
    scanStore.updateProgress({
      filesScanned: 10,
      currentPhase: 'counting',
    });
    render(ProgressBar);
    expect(screen.getByText('Scanning directories...')).toBeInTheDocument();
  });

  it('should show grouping phase label', () => {
    scanStore.startScan();
    scanStore.updateProgress({
      filesScanned: 50,
      currentPhase: 'grouping',
    });
    render(ProgressBar);
    expect(screen.getByText('Grouping by file size...')).toBeInTheDocument();
  });

  it('should show hashing phase label', () => {
    scanStore.startScan();
    scanStore.updateProgress({
      filesScanned: 100,
      currentPhase: 'hashing',
    });
    render(ProgressBar);
    expect(screen.getByText('Computing file hashes...')).toBeInTheDocument();
  });

  it('should show finalizing phase label', () => {
    scanStore.startScan();
    scanStore.updateProgress({
      filesScanned: 100,
      currentPhase: 'finalizing',
    });
    render(ProgressBar);
    expect(screen.getByText('Finding duplicates...')).toBeInTheDocument();
  });

  it('should show percentage when total is known', () => {
    scanStore.startScan();
    scanStore.updateProgress({
      filesScanned: 50,
      filesTotal: 100,
      currentPhase: 'hashing',
    });
    render(ProgressBar);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should show file count', () => {
    scanStore.startScan();
    scanStore.updateProgress({
      filesScanned: 50,
      filesTotal: 100,
      currentPhase: 'hashing',
    });
    render(ProgressBar);
    // Check the count element contains both numbers
    expect(screen.getByText(/50.*100.*files/)).toBeInTheDocument();
  });

  it('should handle unknown phase', () => {
    scanStore.startScan();
    scanStore.updateProgress({
      filesScanned: 10,
      currentPhase: 'unknown' as any,
    });
    render(ProgressBar);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});
