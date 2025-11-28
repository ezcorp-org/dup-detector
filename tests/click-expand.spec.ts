import { test, expect } from '@playwright/test';

test.describe('Click-to-Expand Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Collect console logs
    page.on('console', (msg) => {
      console.log(`[${msg.type()}] ${msg.text()}`);
    });

    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Duplicate File Detector');

    // Inject mock scan results into the store
    await page.evaluate(() => {
      const store = (window as any).__scanStore;
      if (!store) {
        console.error('scanStore not found on window');
        return;
      }

      console.log('Injecting mock scan results');

      // Call finishScan to inject test data
      store.finishScan({
        duplicateGroups: [
          {
            hash: 'abc123def456789',
            size: 1024,
            files: [
              { path: '/path/to/file1.txt', size: 1024, modified: '2024-01-01T12:00:00Z' },
              { path: '/path/to/file2.txt', size: 1024, modified: '2024-01-02T12:00:00Z' },
              { path: '/another/path/file3.txt', size: 1024, modified: '2024-01-03T12:00:00Z' },
            ],
          },
        ],
        totalFilesScanned: 100,
        totalDuplicatesFound: 3,
        totalWastedSpace: 2048,
        errors: [],
        durationMs: 1000,
      });

      console.log('Mock data injected successfully');
    });

    // Wait for the duplicate groups to render
    await expect(page.locator('.duplicate-groups')).toBeVisible({ timeout: 5000 });
  });

  test('should display duplicate groups summary', async ({ page }) => {
    // Verify summary is displayed
    await expect(page.locator('.summary')).toBeVisible();
    await expect(page.locator('.summary')).toContainText('1');
    await expect(page.locator('.summary')).toContainText('group');
  });

  test('should expand group when clicking header', async ({ page }) => {
    // Initially files should not be visible (group collapsed)
    await expect(page.locator('.file-item-header')).not.toBeVisible();

    // Click on group header to expand
    await page.click('.group-header');

    // Now files should be visible
    await expect(page.locator('.file-item-header').first()).toBeVisible();
    await expect(page.locator('.file-name').first()).toContainText('file1.txt');
  });

  test('should show file details when clicking on file item', async ({ page }) => {
    // First expand the group
    await page.click('.group-header');
    await expect(page.locator('.file-item-header').first()).toBeVisible();

    // Initially file details should NOT be visible
    await expect(page.locator('.file-details')).not.toBeVisible();

    // Click on the file item header (not checkbox or delete button)
    const fileHeader = page.locator('.file-item-header').first();
    await fileHeader.click();

    // Wait and check for file details
    await page.waitForTimeout(500); // Give Svelte time to react

    // Check if details are visible
    const detailsVisible = await page.locator('.file-details').first().isVisible().catch(() => false);
    console.log('File details visible:', detailsVisible);

    // Check the expand icon
    const expandIcon = await page.locator('.file-expand-icon').first().textContent();
    console.log('Expand icon:', expandIcon);

    await expect(page.locator('.file-details').first()).toBeVisible();
    await expect(page.locator('.file-details').first()).toContainText('Full Path:');
  });

  test('should click specifically on expand icon', async ({ page }) => {
    // First expand the group
    await page.click('.group-header');
    await expect(page.locator('.file-item-header').first()).toBeVisible();

    // Get the expand icon
    const expandIcon = page.locator('.file-expand-icon').first();

    // Check initial state
    await expect(expandIcon).toHaveText('▶');

    // Click on the expand icon specifically
    await expandIcon.click();

    // Wait for state change
    await page.waitForTimeout(500);

    // Check if icon changed
    const iconText = await expandIcon.textContent();
    console.log('Icon after click:', iconText);

    // Details should be visible
    await expect(page.locator('.file-details').first()).toBeVisible();
  });

  test('should click on file-info area', async ({ page }) => {
    // First expand the group
    await page.click('.group-header');
    await expect(page.locator('.file-item-header').first()).toBeVisible();

    // Click on the file-info div
    await page.locator('.file-info').first().click();

    // Wait for state change
    await page.waitForTimeout(500);

    // Details should be visible
    const detailsVisible = await page.locator('.file-details').first().isVisible().catch(() => false);
    console.log('Details visible after clicking file-info:', detailsVisible);
  });

  test('should NOT expand when clicking checkbox', async ({ page }) => {
    // First expand the group
    await page.click('.group-header');
    await expect(page.locator('.file-item-header').first()).toBeVisible();

    // Click on checkbox
    await page.locator('.file-item-header input[type="checkbox"]').first().click();

    // Wait briefly
    await page.waitForTimeout(300);

    // File details should NOT be visible
    await expect(page.locator('.file-details')).not.toBeVisible();
  });

  test('should NOT expand when clicking delete button', async ({ page }) => {
    // First expand the group
    await page.click('.group-header');
    await expect(page.locator('.file-item-header').first()).toBeVisible();

    // Click on delete button
    await page.locator('.btn-delete-file').first().click();

    // File details should NOT be visible (confirm dialog might appear)
    await expect(page.locator('.file-details')).not.toBeVisible();
  });

  test('debug: log what happens on click', async ({ page }) => {
    // First expand the group
    await page.click('.group-header');
    await expect(page.locator('.file-item-header').first()).toBeVisible();

    // Get the HTML structure before click
    const htmlBefore = await page.locator('.file-item-wrapper').first().innerHTML();
    console.log('HTML before click:', htmlBefore.substring(0, 500));

    // Try clicking with force
    const fileHeader = page.locator('.file-item-header').first();
    const box = await fileHeader.boundingBox();
    console.log('File header bounding box:', box);

    if (box) {
      // Click in the middle of the header
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }

    await page.waitForTimeout(500);

    // Get HTML after click
    const htmlAfter = await page.locator('.file-item-wrapper').first().innerHTML();
    console.log('HTML after click:', htmlAfter.substring(0, 500));

    // Check if class changed
    const hasExpandedClass = await page.locator('.file-item-wrapper.expanded').first().isVisible().catch(() => false);
    console.log('Has expanded class:', hasExpandedClass);
  });
});
