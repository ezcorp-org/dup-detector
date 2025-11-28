import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { folderStore, hasFolders, folderCount, scanOptions } from './folderStore';

describe('folderStore', () => {
  beforeEach(() => {
    folderStore.reset();
  });

  describe('initial state', () => {
    it('has empty folders', () => {
      expect(get(folderStore).folders).toEqual([]);
    });

    it('has null minFileSize', () => {
      expect(get(folderStore).minFileSize).toBeNull();
    });

    it('has KB as default sizeUnit', () => {
      expect(get(folderStore).sizeUnit).toBe('KB');
    });

    it('has empty includeExtensions', () => {
      expect(get(folderStore).includeExtensions).toBe('');
    });

    it('has empty excludeExtensions', () => {
      expect(get(folderStore).excludeExtensions).toBe('');
    });

    it('has useIncludeMode true by default', () => {
      expect(get(folderStore).useIncludeMode).toBe(true);
    });

    it('has followSymlinks false by default', () => {
      expect(get(folderStore).followSymlinks).toBe(false);
    });
  });

  describe('folder management', () => {
    it('adds a folder', () => {
      folderStore.addFolder('/test/path');
      expect(get(folderStore).folders).toContain('/test/path');
    });

    it('does not add duplicate folders', () => {
      folderStore.addFolder('/test/path');
      folderStore.addFolder('/test/path');
      expect(get(folderStore).folders.length).toBe(1);
    });

    it('adds multiple folders', () => {
      folderStore.addFolders(['/path1', '/path2', '/path3']);
      expect(get(folderStore).folders.length).toBe(3);
    });

    it('removes a folder', () => {
      folderStore.addFolder('/test/path');
      folderStore.removeFolder('/test/path');
      expect(get(folderStore).folders).not.toContain('/test/path');
    });

    it('clears all folders', () => {
      folderStore.addFolders(['/path1', '/path2']);
      folderStore.clearFolders();
      expect(get(folderStore).folders).toEqual([]);
    });
  });

  describe('filter settings', () => {
    it('sets min file size', () => {
      folderStore.setMinFileSize(100);
      expect(get(folderStore).minFileSize).toBe(100);
    });

    it('sets size unit', () => {
      folderStore.setSizeUnit('MB');
      expect(get(folderStore).sizeUnit).toBe('MB');
    });

    it('sets include extensions', () => {
      folderStore.setIncludeExtensions('jpg, png, gif');
      expect(get(folderStore).includeExtensions).toBe('jpg, png, gif');
    });

    it('sets exclude extensions', () => {
      folderStore.setExcludeExtensions('tmp, bak');
      expect(get(folderStore).excludeExtensions).toBe('tmp, bak');
    });

    it('sets useIncludeMode', () => {
      folderStore.setUseIncludeMode(false);
      expect(get(folderStore).useIncludeMode).toBe(false);
    });

    it('sets followSymlinks', () => {
      folderStore.setFollowSymlinks(true);
      expect(get(folderStore).followSymlinks).toBe(true);
    });
  });
});

describe('derived stores', () => {
  beforeEach(() => {
    folderStore.reset();
  });

  it('hasFolders returns false when empty', () => {
    expect(get(hasFolders)).toBe(false);
  });

  it('hasFolders returns true when folders exist', () => {
    folderStore.addFolder('/test');
    expect(get(hasFolders)).toBe(true);
  });

  it('folderCount returns correct count', () => {
    expect(get(folderCount)).toBe(0);
    folderStore.addFolders(['/a', '/b', '/c']);
    expect(get(folderCount)).toBe(3);
  });
});

describe('scanOptions derivation', () => {
  beforeEach(() => {
    folderStore.reset();
  });

  describe('rootPaths', () => {
    it('includes all added folders', () => {
      folderStore.addFolders(['/path1', '/path2']);
      const options = get(scanOptions);
      expect(options.rootPaths).toEqual(['/path1', '/path2']);
    });
  });

  describe('minFileSize', () => {
    it('is undefined when not set', () => {
      const options = get(scanOptions);
      expect(options.minFileSize).toBeUndefined();
    });

    it('is undefined when set to 0', () => {
      folderStore.setMinFileSize(0);
      const options = get(scanOptions);
      expect(options.minFileSize).toBeUndefined();
    });

    it('converts KB to bytes', () => {
      folderStore.setMinFileSize(10);
      folderStore.setSizeUnit('KB');
      const options = get(scanOptions);
      expect(options.minFileSize).toBe(10 * 1024);
    });

    it('converts MB to bytes', () => {
      folderStore.setMinFileSize(5);
      folderStore.setSizeUnit('MB');
      const options = get(scanOptions);
      expect(options.minFileSize).toBe(5 * 1024 * 1024);
    });
  });

  describe('includeExtensions', () => {
    it('is undefined when empty', () => {
      const options = get(scanOptions);
      expect(options.includeExtensions).toBeUndefined();
    });

    it('is undefined when in exclude mode', () => {
      folderStore.setIncludeExtensions('jpg, png');
      folderStore.setUseIncludeMode(false);
      const options = get(scanOptions);
      expect(options.includeExtensions).toBeUndefined();
    });

    it('parses comma-separated extensions', () => {
      folderStore.setIncludeExtensions('jpg, png, gif');
      const options = get(scanOptions);
      expect(options.includeExtensions).toEqual(['jpg', 'png', 'gif']);
    });

    it('handles extensions with dots', () => {
      folderStore.setIncludeExtensions('.jpg, .png');
      const options = get(scanOptions);
      expect(options.includeExtensions).toEqual(['jpg', 'png']);
    });

    it('converts to lowercase', () => {
      folderStore.setIncludeExtensions('JPG, PNG, GIF');
      const options = get(scanOptions);
      expect(options.includeExtensions).toEqual(['jpg', 'png', 'gif']);
    });

    it('trims whitespace', () => {
      folderStore.setIncludeExtensions('  jpg  ,  png  ');
      const options = get(scanOptions);
      expect(options.includeExtensions).toEqual(['jpg', 'png']);
    });

    it('filters out empty entries', () => {
      folderStore.setIncludeExtensions('jpg,,png,  ,gif');
      const options = get(scanOptions);
      expect(options.includeExtensions).toEqual(['jpg', 'png', 'gif']);
    });

    it('handles single extension', () => {
      folderStore.setIncludeExtensions('pdf');
      const options = get(scanOptions);
      expect(options.includeExtensions).toEqual(['pdf']);
    });

    it('handles mixed case and dots', () => {
      folderStore.setIncludeExtensions('.JPG, png, .GIF');
      const options = get(scanOptions);
      expect(options.includeExtensions).toEqual(['jpg', 'png', 'gif']);
    });
  });

  describe('excludeExtensions', () => {
    it('is undefined when empty', () => {
      folderStore.setUseIncludeMode(false);
      const options = get(scanOptions);
      expect(options.excludeExtensions).toBeUndefined();
    });

    it('is undefined when in include mode', () => {
      folderStore.setExcludeExtensions('tmp, bak');
      folderStore.setUseIncludeMode(true);
      const options = get(scanOptions);
      expect(options.excludeExtensions).toBeUndefined();
    });

    it('parses comma-separated extensions', () => {
      folderStore.setExcludeExtensions('tmp, bak, log');
      folderStore.setUseIncludeMode(false);
      const options = get(scanOptions);
      expect(options.excludeExtensions).toEqual(['tmp', 'bak', 'log']);
    });

    it('handles extensions with dots', () => {
      folderStore.setExcludeExtensions('.tmp, .bak');
      folderStore.setUseIncludeMode(false);
      const options = get(scanOptions);
      expect(options.excludeExtensions).toEqual(['tmp', 'bak']);
    });

    it('converts to lowercase', () => {
      folderStore.setExcludeExtensions('TMP, BAK');
      folderStore.setUseIncludeMode(false);
      const options = get(scanOptions);
      expect(options.excludeExtensions).toEqual(['tmp', 'bak']);
    });
  });

  describe('followSymlinks', () => {
    it('is false by default', () => {
      const options = get(scanOptions);
      expect(options.followSymlinks).toBe(false);
    });

    it('reflects store value', () => {
      folderStore.setFollowSymlinks(true);
      const options = get(scanOptions);
      expect(options.followSymlinks).toBe(true);
    });
  });

  describe('mutual exclusivity of include/exclude', () => {
    it('only sends includeExtensions when in include mode', () => {
      folderStore.setIncludeExtensions('jpg, png');
      folderStore.setExcludeExtensions('tmp, bak');
      folderStore.setUseIncludeMode(true);

      const options = get(scanOptions);
      expect(options.includeExtensions).toEqual(['jpg', 'png']);
      expect(options.excludeExtensions).toBeUndefined();
    });

    it('only sends excludeExtensions when in exclude mode', () => {
      folderStore.setIncludeExtensions('jpg, png');
      folderStore.setExcludeExtensions('tmp, bak');
      folderStore.setUseIncludeMode(false);

      const options = get(scanOptions);
      expect(options.includeExtensions).toBeUndefined();
      expect(options.excludeExtensions).toEqual(['tmp', 'bak']);
    });
  });
});
