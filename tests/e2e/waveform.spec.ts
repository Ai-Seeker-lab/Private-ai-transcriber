import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('tannscribe.onboardingDone', '1'); } catch { /* ignore */ } });
});

test('waveform segment drag moves the transcript timestamp', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('#lines tbody tr').nth(0);
  const before = (await row.locator('.tc').textContent()) ?? '';
  // Shrink segment 0 via the time editor so the segment has free space to move in.
  await row.locator('.tc').dblclick();
  const endInput = page.locator('#lines tbody tr').nth(0).locator('.time-input').nth(1);
  await endInput.fill('5');
  await page.keyboard.press('Enter');
  await expect(row.locator('.time-input')).toHaveCount(0);
  const seg = page.locator('#wave .wave__seg').nth(0);
  const box = await seg.boundingBox();
  expect(box).not.toBeNull();
  const y = box!.y + box!.height / 2;
  const startX = box!.x + box!.width / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + 30, y, { steps: 4 });
  await page.mouse.up();
  const after = (await row.locator('.tc').textContent()) ?? '';
  expect(after).not.toBe(before);
});

test('waveform segment drag can be undone', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('#lines tbody tr').nth(1);
  const before = (await row.locator('.tc').textContent()) ?? '';
  const seg = page.locator('#wave .wave__seg').nth(1);
  const box = await seg.boundingBox();
  expect(box).not.toBeNull();
  const edgeZone = Math.max(6, box!.width * 0.12);
  const y = box!.y + box!.height / 2;
  const startX = box!.x + edgeZone / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + 30, y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await page.keyboard.down('Control');
  await page.keyboard.press('z');
  await page.keyboard.up('Control');
  const after = (await row.locator('.tc').textContent()) ?? '';
  expect(after).toBe(before);
});

test('waveform segment edge resize updates the start time', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('#lines tbody tr').nth(1);
  const before = (await row.locator('.tc').textContent()) ?? '';
  const seg = page.locator('#wave .wave__seg').nth(1);
  const box = await seg.boundingBox();
  expect(box).not.toBeNull();
  const edgeZone = Math.max(6, box!.width * 0.12);
  const y = box!.y + box!.height / 2;
  const startX = box!.x + edgeZone / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + 30, y, { steps: 4 });
  await page.mouse.up();
  const after = (await row.locator('.tc').textContent()) ?? '';
  expect(after).not.toBe(before);
});
