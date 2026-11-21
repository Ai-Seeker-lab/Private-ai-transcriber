import { test, expect } from '@playwright/test';

test('page loads with core elements', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Tannscribe/);
  await expect(page.locator('#dropzone')).toBeVisible();
  await expect(page.locator('#run')).toBeVisible();
  await expect(page.locator('#copy')).toBeVisible();
  await expect(page.locator('#srt')).toBeVisible();
  await expect(page.locator('#vtt')).toBeVisible();
  await expect(page.locator('#txt')).toBeVisible();
  await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute('content', 'twDefilWnlCbrUWNPAdsd9IZZ_1WGECz5uiCfbmLhsY');
});

test('no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('search filters transcript rows', async ({ page }) => {
  await page.goto('/');
  await page.fill('#search', 'money');
  const visible = await page.locator('#lines tbody tr:not([hidden])').count();
  expect(visible).toBe(1);
  await page.fill('#search', '');
  const all = await page.locator('#lines tbody tr').count();
  const visibleAfter = await page.locator('#lines tbody tr:not([hidden])').count();
  expect(visibleAfter).toBe(all);
});

test('TXT export downloads with content', async ({ page }) => {
  await page.goto('/');
  const downloadPromise = page.waitForEvent('download');
  await page.click('#txt');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.txt$/);
  const stream = await download.createReadStream();
  let data = '';
  for await (const chunk of stream) data += chunk.toString();
  expect(data).toContain('Look at the girl');
  expect(data).toMatch(/\d+:\d+/);
});

test('SRT export has valid timestamps', async ({ page }) => {
  await page.goto('/');
  const downloadPromise = page.waitForEvent('download');
  await page.click('#srt');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.srt$/);
  const stream = await download.createReadStream();
  let data = '';
  for await (const chunk of stream) data += chunk.toString();
  expect(data).toMatch(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/);
  expect(data).toContain('Look at the girl');
});

test('editable cell persists text', async ({ page }) => {
  await page.goto('/');
  const cell = page.locator('#lines tbody td[contenteditable="true"]').first();
  await cell.click();
  await cell.fill('EDITED');
  await cell.blur();
  await expect(cell).toHaveText('EDITED');
});

test('VTT export starts with WEBVTT', async ({ page }) => {
  await page.goto('/');
  const downloadPromise = page.waitForEvent('download');
  await page.click('#vtt');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.vtt$/);
  const stream = await download.createReadStream();
  let data = '';
  for await (const chunk of stream) data += chunk.toString();
  expect(data.startsWith('WEBVTT')).toBe(true);
});

test('timestamp is editable via double click', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('#lines tbody .tc').first();
  await btn.dblclick();
  await expect(page.locator('.time-input').first()).toBeVisible();
  await page.keyboard.press('Escape');
});

test('speed select changes playback rate', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#speed', '2');
  const rate = await page.evaluate(() => document.getElementById('player').playbackRate);
  expect(rate).toBe(2);
});

test('subtitle overlay exists', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#subtitleOverlay')).toBeAttached();
});
