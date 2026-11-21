import { test } from '@playwright/test';

let AxeBuilder: any = null;
try {
  AxeBuilder = (await import('@axe-core/playwright')).default;
} catch {
  AxeBuilder = null;
}

test.describe('axe audit', () => {
  test.skip(!AxeBuilder, 'requires @axe-core/playwright (npm i -D @axe-core/playwright)');

  test('desktop', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .exclude('.native-ad')
      .exclude('#ad-slot-sidebar')
      .exclude('#ad-slot-bottom')
      .analyze();
    console.log('DESKTOP VIOLATIONS:', results.violations.length);
    for (const v of results.violations) console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
  });

  test('mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .exclude('.native-ad')
      .exclude('#ad-slot-sidebar')
      .exclude('#ad-slot-bottom')
      .analyze();
    console.log('MOBILE VIOLATIONS:', results.violations.length);
    for (const v of results.violations) console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
  });
});
