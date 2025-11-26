import { test, expect } from '@playwright/test';

test.describe('Duplicate File Detector', () => {
  test('shows app title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Duplicate File Detector');
  });

  test('shows folder selector', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Folders to Scan')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Folder' })).toBeVisible();
  });

  test('shows scan controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Start Scan')).toBeVisible();
    await expect(page.locator('text=Min File Size')).toBeVisible();
  });

  test('start scan button is disabled without folders', async ({ page }) => {
    await page.goto('/');
    const startButton = page.locator('button:has-text("Start Scan")');
    await expect(startButton).toBeDisabled();
  });

  test('shows empty state message', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=No folders selected')).toBeVisible();
  });

  test('footer shows ready status', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer')).toContainText('Ready');
  });
});
