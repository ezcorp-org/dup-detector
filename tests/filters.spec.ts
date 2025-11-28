import { test, expect } from '@playwright/test';

test.describe('Advanced Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Advanced Filtering dropdown is visible', async ({ page }) => {
    await expect(page.locator('text=Advanced Filtering')).toBeVisible();
  });

  test('Advanced Filtering is collapsed by default', async ({ page }) => {
    // The filter inputs should not be visible by default
    await expect(page.locator('label:has-text("Min File Size")')).not.toBeVisible();
  });

  test('clicking Advanced Filtering expands the filter section', async ({ page }) => {
    await page.click('button:has-text("Advanced Filtering")');

    // Filter inputs should now be visible
    await expect(page.locator('label:has-text("Min File Size")')).toBeVisible();
    await expect(page.locator('text=Include Extensions')).toBeVisible();
    await expect(page.locator('text=Exclude Extensions')).toBeVisible();
    await expect(page.locator('text=Follow Symlinks')).toBeVisible();
  });

  test('clicking Advanced Filtering again collapses the section', async ({ page }) => {
    // Expand
    await page.click('button:has-text("Advanced Filtering")');
    await expect(page.locator('label:has-text("Min File Size")')).toBeVisible();

    // Collapse
    await page.click('button:has-text("Advanced Filtering")');
    await expect(page.locator('label:has-text("Min File Size")')).not.toBeVisible();
  });

  test.describe('Min File Size Filter', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('button:has-text("Advanced Filtering")');
    });

    test('can enter min file size value', async ({ page }) => {
      const sizeInput = page.locator('input#min-size');
      await sizeInput.fill('100');
      await expect(sizeInput).toHaveValue('100');
    });

    test('can change size unit to MB', async ({ page }) => {
      const unitSelect = page.locator('select').first();
      await unitSelect.selectOption('MB');
      await expect(unitSelect).toHaveValue('MB');
    });

    test('can change size unit to KB', async ({ page }) => {
      const unitSelect = page.locator('select').first();
      await unitSelect.selectOption('KB');
      await expect(unitSelect).toHaveValue('KB');
    });

    test('shows Active badge when filter is set', async ({ page }) => {
      const sizeInput = page.locator('input#min-size');
      await sizeInput.fill('100');

      // Wait for the input to be processed
      await expect(sizeInput).toHaveValue('100');

      // Collapse the section to see the badge
      await page.click('button:has-text("Advanced Filtering")');
      await expect(page.locator('span.active-badge')).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Include Extensions Filter', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('button:has-text("Advanced Filtering")');
    });

    test('Include Extensions radio is selected by default', async ({ page }) => {
      const includeRadio = page.locator('input[type="radio"]').first();
      await expect(includeRadio).toBeChecked();
    });

    test('can enter include extensions', async ({ page }) => {
      const includeInput = page.locator('input[placeholder="jpg, png, gif"]');
      await includeInput.fill('jpg, png, gif');
      await expect(includeInput).toHaveValue('jpg, png, gif');
    });

    test('include extensions input is enabled when include mode is selected', async ({ page }) => {
      const includeInput = page.locator('input[placeholder="jpg, png, gif"]');
      await expect(includeInput).toBeEnabled();
    });

    test('exclude extensions input is disabled when include mode is selected', async ({ page }) => {
      const excludeInput = page.locator('input[placeholder="tmp, bak, log"]');
      await expect(excludeInput).toBeDisabled();
    });

    test('shows Active badge when include extensions are set', async ({ page }) => {
      const includeInput = page.locator('input[placeholder="jpg, png, gif"]');
      await includeInput.fill('jpg');

      // Wait for input to be processed
      await expect(includeInput).toHaveValue('jpg');

      // Collapse the section to see the badge
      await page.click('button:has-text("Advanced Filtering")');
      await expect(page.locator('span.active-badge')).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Exclude Extensions Filter', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('button:has-text("Advanced Filtering")');
    });

    test('can switch to exclude mode', async ({ page }) => {
      const excludeRadio = page.locator('input[type="radio"]').nth(1);
      await excludeRadio.click();
      await expect(excludeRadio).toBeChecked();
    });

    test('can enter exclude extensions', async ({ page }) => {
      // Switch to exclude mode
      await page.click('text=Exclude Extensions');

      const excludeInput = page.locator('input[placeholder="tmp, bak, log"]');
      await excludeInput.fill('tmp, bak');
      await expect(excludeInput).toHaveValue('tmp, bak');
    });

    test('exclude extensions input is enabled when exclude mode is selected', async ({ page }) => {
      // Switch to exclude mode
      await page.click('text=Exclude Extensions');

      const excludeInput = page.locator('input[placeholder="tmp, bak, log"]');
      await expect(excludeInput).toBeEnabled();
    });

    test('include extensions input is disabled when exclude mode is selected', async ({ page }) => {
      // Switch to exclude mode
      await page.click('text=Exclude Extensions');

      const includeInput = page.locator('input[placeholder="jpg, png, gif"]');
      await expect(includeInput).toBeDisabled();
    });

    test('shows Active badge when exclude extensions are set', async ({ page }) => {
      // Switch to exclude mode
      await page.click('text=Exclude Extensions');

      const excludeInput = page.locator('input[placeholder="tmp, bak, log"]');
      await excludeInput.fill('tmp');

      // Wait for input to be processed
      await expect(excludeInput).toHaveValue('tmp');

      // Collapse the section to see the badge
      await page.click('button:has-text("Advanced Filtering")');
      await expect(page.locator('span.active-badge')).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Follow Symlinks Option', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('button:has-text("Advanced Filtering")');
    });

    test('Follow Symlinks checkbox is unchecked by default', async ({ page }) => {
      const checkbox = page.locator('input[type="checkbox"]').first();
      await expect(checkbox).not.toBeChecked();
    });

    test('can enable Follow Symlinks', async ({ page }) => {
      const checkbox = page.locator('input[type="checkbox"]').first();
      await checkbox.click();
      await expect(checkbox).toBeChecked();
    });

    test('shows Active badge when Follow Symlinks is enabled', async ({ page }) => {
      const checkbox = page.locator('input[type="checkbox"]').first();
      await checkbox.click();

      // Wait for the checkbox to be checked
      await expect(checkbox).toBeChecked();

      // Collapse the section to see the badge
      await page.click('button:has-text("Advanced Filtering")');
      await expect(page.locator('span.active-badge')).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Mode Switching', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('button:has-text("Advanced Filtering")');
    });

    test('switching from include to exclude mode keeps include value', async ({ page }) => {
      const includeInput = page.locator('input[placeholder="jpg, png, gif"]');
      await includeInput.fill('jpg, png');

      // Switch to exclude mode
      await page.click('text=Exclude Extensions');

      // Switch back to include mode
      await page.click('text=Include Extensions');

      // Value should still be there
      await expect(includeInput).toHaveValue('jpg, png');
    });

    test('switching from exclude to include mode keeps exclude value', async ({ page }) => {
      // Switch to exclude mode
      await page.click('text=Exclude Extensions');

      const excludeInput = page.locator('input[placeholder="tmp, bak, log"]');
      await excludeInput.fill('tmp, bak');

      // Switch to include mode
      await page.click('text=Include Extensions');

      // Switch back to exclude mode
      await page.click('text=Exclude Extensions');

      // Value should still be there
      await expect(excludeInput).toHaveValue('tmp, bak');
    });
  });

  test.describe('Combined Filters', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('button:has-text("Advanced Filtering")');
    });

    test('can set multiple filters at once', async ({ page }) => {
      // Set min file size
      const sizeInput = page.locator('input#min-size');
      await sizeInput.fill('100');
      await page.locator('select').first().selectOption('KB');

      // Set include extensions
      const includeInput = page.locator('input[placeholder="jpg, png, gif"]');
      await includeInput.fill('jpg, png');

      // Enable follow symlinks
      await page.locator('input[type="checkbox"]').first().click();

      // Verify all values are set
      await expect(sizeInput).toHaveValue('100');
      await expect(includeInput).toHaveValue('jpg, png');
      await expect(page.locator('input[type="checkbox"]').first()).toBeChecked();

      // Collapse and check badge
      await page.click('button:has-text("Advanced Filtering")');
      await expect(page.locator('span.active-badge')).toBeVisible({ timeout: 3000 });
    });

    test('Active badge is hidden when no filters are set', async ({ page }) => {
      // Don't set any filters, just collapse
      await page.click('button:has-text("Advanced Filtering")');
      await expect(page.locator('span.active-badge')).not.toBeVisible();
    });
  });
});
