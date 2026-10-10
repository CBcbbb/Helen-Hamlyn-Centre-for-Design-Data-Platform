import { test, expect } from '@playwright/test';

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('homepage shows the featured project and links outwards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Design Bugs Out' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Personas' }).first()).toHaveAttribute('href', '/methods/personas');
  });

  test('entity page has content, connections and metadata', async ({ page }) => {
    await page.goto('/methods/critical-user-forums');
    await expect(page.getByRole('heading', { level: 1, name: 'Critical User Forums' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Step by step' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Research Associate Programme' })).toBeVisible();
    await expect(page).toHaveTitle(/Critical User Forums/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Critical User Forums');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/methods\/critical-user-forums$/);
  });

  test('network map entries are links to entity pages', async ({ page }) => {
    await page.goto('/explore');
    const entry = page.locator('a.graph-node[href="/projects/design-bugs-out"]');
    await expect(entry).toHaveCount(1);
  });

  test('table view lists every entity as a link', async ({ page }) => {
    await page.goto('/explore/table');
    await expect(page.locator('table')).toHaveCount(4);
    await expect(page.locator('tbody tr')).toHaveCount(48);
  });
});

test('sitemap lists every entity page and robots points to it', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  // 48 entity pages + home, four type indexes, map, table and about.
  expect(sitemap.match(/<url>/g)?.length).toBe(48 + 8);
  expect(sitemap).toContain('/projects/design-bugs-out</loc>');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
});

test('unknown entity returns 404', async ({ request }) => {
  const res = await request.get('/projects/not-a-project');
  expect(res.status()).toBe(404);
});

test('skip link moves focus to main content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard path');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test.describe('network map by keyboard', () => {
  test.skip(({ isMobile }) => isMobile, 'Keyboard path');

  test('arrow keys move between entries; Enter opens details; Escape returns focus', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    const first = page.locator('g.graph-node[tabindex="0"]');
    await expect(first).toHaveCount(1);
    await first.focus();
    const startLabel = await first.getAttribute('aria-label');
    await page.keyboard.press('ArrowRight');
    const focusedLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(focusedLabel).not.toBe(startLabel);
    expect(focusedLabel).toMatch(/person/);
    await page.keyboard.press('Enter');
    const name = focusedLabel!.split(',')[0];
    await expect(page.locator('#details-title')).toHaveText(name);
    await expect(page.locator('#details-title')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#details-title')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute('aria-label')))
      .toBe(focusedLabel);
    // Only one entry is ever in the tab order.
    await expect(page.locator('g.graph-node[tabindex="0"]')).toHaveCount(1);
  });

  test('search announces result count; Ctrl+E switches to the table', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('searchbox')).toBeFocused();
    await page.keyboard.type('inclusive');
    await expect(page.getByRole('status')).toHaveText(/13 entries match “inclusive”/);
    await page.keyboard.press('Control+e');
    await expect(page).toHaveURL(/\/explore\/table$/);
    await expect(page.getByRole('searchbox')).toHaveValue('inclusive');
    await expect(page.getByRole('status')).toHaveText('Showing the table view');
  });

  test('filters hide a type and are announced', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    await page.getByRole('checkbox', { name: /Partners/ }).uncheck();
    await expect(page.getByRole('status')).toHaveText(/Partners hidden\. 39 of 48 entries shown\./);
    await expect(page.locator('g.graph-node')).toHaveCount(39);
  });
});

test('narrow screen: details open as a full-screen dialog and close back', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile layout');
  await page.goto('/explore/table');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'PACES' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#details-title')).toHaveText('PACES');
  await dialog.getByRole('button', { name: 'Back to the network' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'PACES' })).toBeFocused();
});

test('no horizontal scroll at 360px', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  for (const route of ['/', '/projects', '/projects/design-bugs-out', '/explore', '/explore/table', '/about']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, route).toBeLessThanOrEqual(0);
  }
  await page.close();
});
