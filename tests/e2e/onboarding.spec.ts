import { test, expect } from '@playwright/test';

test('first visit opens the three step onboarding and finishes it', async ({ page }) => {
  await page.goto('/');
  const dialog = page.locator('#onboarding');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#onboardingStepLabel')).toHaveText('Step 1 of 3');
  await expect(page.locator('#onboardingStepTitle')).toHaveText('Step 1: Upload');
  await page.click('#onboardingNext');
  await expect(page.locator('#onboardingStepTitle')).toHaveText('Step 2: Transcribe and edit');
  await page.click('#onboardingBack');
  await expect(page.locator('#onboardingStepTitle')).toHaveText('Step 1: Upload');
  await page.click('#onboardingNext');
  await page.click('#onboardingNext');
  await expect(page.locator('#onboardingStepTitle')).toHaveText('Step 3: Preview and export');
  await page.click('#onboardingNext');
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(dialog).toBeHidden();
});

test('skip dismisses the onboarding and persists', async ({ page }) => {
  await page.goto('/');
  const dialog = page.locator('#onboarding');
  await expect(dialog).toBeVisible();
  await page.click('#onboardingSkip');
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(dialog).toBeHidden();
});

test('restart the tour from the support dialog', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('tannscribe.onboardingDone', '1'); } catch { /* ignore */ } });
  await page.goto('/');
  await expect(page.locator('#onboarding')).toBeHidden();
  await page.click('#supportOpen');
  const support = page.locator('#support');
  await expect(support).toBeVisible();
  await page.click('#onboardingRestart');
  await expect(page.locator('#onboarding')).toBeVisible();
});
