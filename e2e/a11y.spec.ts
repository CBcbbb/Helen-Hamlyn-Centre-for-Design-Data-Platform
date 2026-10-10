import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Main routes: one of each page type. */
const ROUTES = [
  '/',
  '/projects',
  '/projects/design-bugs-out',
  '/methods/critical-user-forums',
  '/people/hua-dong',
  '/partners/royal-college-of-art',
  '/explore',
  '/explore/table',
  '/about',
];

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

for (const route of ROUTES) {
  test(`no axe violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join('\n  ')}`,
    );
    expect(summary, summary.join('\n')).toEqual([]);
  });
}

test('details panel open: no axe violations', async ({ page }) => {
  await page.goto('/explore/table');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Design Bugs Out' }).click();
  await expect(page.locator('#details-title')).toHaveText('Design Bugs Out');
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test('keyboard shortcuts dialog open: no axe violations', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The ? shortcut is a keyboard feature');
  await page.goto('/explore');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
