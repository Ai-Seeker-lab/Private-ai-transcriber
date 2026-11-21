import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('tannscribe.onboardingDone', '1'); } catch { /* ignore */ } });
});

test('mobile edit times dialog opens, applies and closes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('.mob-edit')).toBeVisible();
  await page.click('#mobEdit');
  const dialog = page.locator('#mobileEditor');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#mobileEditorList .mobile-editor__row')).toHaveCount(8);
  const first = page.locator('#mobileEditorList .mobile-editor__row').nth(0);
  await first.locator('[data-role="start"]').fill('3');
  await first.locator('[data-role="end"]').fill('5');
  await page.click('#mobileEditorSave');
  await expect(dialog).toBeHidden();
  await expect(page.locator('#lines tbody tr').nth(0).locator('.tc')).toHaveText('0:03.0');
});
