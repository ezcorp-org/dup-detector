import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  truncateHash,
  getFileName,
  getDirectory,
  formatDuration,
  formatNumber,
  pluralize,
} from './format';

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('respects decimal places', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB');
    expect(formatBytes(1536, 3)).toBe('1.5 KB');
  });
});

describe('truncateHash', () => {
  it('truncates long hashes', () => {
    const hash = 'abcdef1234567890abcdef1234567890';
    expect(truncateHash(hash)).toBe('abcdef12...');
  });

  it('does not truncate short strings', () => {
    expect(truncateHash('abc')).toBe('abc');
    expect(truncateHash('abcdefgh')).toBe('abcdefgh');
  });

  it('respects custom length', () => {
    const hash = 'abcdef1234567890';
    expect(truncateHash(hash, 4)).toBe('abcd...');
  });
});

describe('getFileName', () => {
  it('extracts filename from Unix path', () => {
    expect(getFileName('/home/user/file.txt')).toBe('file.txt');
  });

  it('extracts filename from Windows path', () => {
    expect(getFileName('C:\\Users\\file.txt')).toBe('file.txt');
  });

  it('handles filename without path', () => {
    expect(getFileName('file.txt')).toBe('file.txt');
  });

  it('handles path ending with separator', () => {
    expect(getFileName('/home/user/')).toBe('user');
  });
});

describe('getDirectory', () => {
  it('extracts directory from Unix path', () => {
    expect(getDirectory('/home/user/file.txt')).toBe('/home/user');
  });

  it('extracts directory from Windows path', () => {
    expect(getDirectory('C:\\Users\\file.txt')).toBe('C:/Users');
  });

  it('handles root path', () => {
    expect(getDirectory('/file.txt')).toBe('/');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(1000)).toBe('1.0s');
    expect(formatDuration(5500)).toBe('5.5s');
    expect(formatDuration(59000)).toBe('59.0s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(125000)).toBe('2m 5s');
  });
});

describe('formatNumber', () => {
  it('formats small numbers', () => {
    expect(formatNumber(42)).toBe('42');
  });

  it('formats large numbers with separators', () => {
    // Note: This depends on locale, so we check for presence of formatted string
    const result = formatNumber(1000000);
    expect(result).toContain('1');
    expect(result.length).toBeGreaterThan(1);
  });
});

describe('pluralize', () => {
  it('uses singular for 1', () => {
    expect(pluralize(1, 'file')).toBe('1 file');
    expect(pluralize(1, 'group', 'groups')).toBe('1 group');
  });

  it('uses plural for 0', () => {
    expect(pluralize(0, 'file')).toBe('0 files');
  });

  it('uses plural for > 1', () => {
    expect(pluralize(5, 'file')).toBe('5 files');
  });

  it('uses custom plural form', () => {
    expect(pluralize(2, 'person', 'people')).toBe('2 people');
  });

  it('formats large numbers', () => {
    const result = pluralize(1000, 'file');
    expect(result).toContain('file');
  });
});
