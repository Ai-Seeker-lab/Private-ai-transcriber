import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('axe audit desktop', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .exclude('.native-ad')
    .exclude('#ad-slot-sidebar')
    .exclude('#ad-slot-bottom')
    .analyze();
  console.log('DESKTOP VIOLATIONS:', results.violations.length);
  for (const v of results.violations) {
    console.log(`  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
    for (const n of v.nodes.slice(0, 3)) console.log(`     ${n.target.join(' ')}`);
  }
});

test('axe audit mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .exclude('.native-ad')
    .exclude('#ad-slot-sidebar')
    .exclude('#ad-slot-bottom')
    .analyze();
  console.log('MOBILE VIOLATIONS:', results.violations.length);
  for (const v of results.violations) {
    console.log(`  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
    for (const n of v.nodes.slice(0, 3)) console.log(`     ${n.target.join(' ')}`);
  }
});
