import { test, expect } from '@playwright/test';

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('home page is the map, drawn as links to every entry', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('a.graph-node')).toHaveCount(48);
    await expect(page.locator('a.graph-node[href="/methods/personas"]')).toHaveCount(1);
    // Controls that need JavaScript are not shown.
    await expect(page.getByRole('searchbox')).toBeHidden();
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

  test('table view lists every entity as a link in one table', async ({ page }) => {
    await page.goto('/table');
    await expect(page.locator('table')).toHaveCount(1);
    await expect(page.locator('tbody tr')).toHaveCount(48);
  });
});

test('sitemap lists every entity page and robots points to it', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  // 48 entity pages + home (the map), four type indexes, table and about.
  expect(sitemap.match(/<url>/g)?.length).toBe(48 + 7);
  expect(sitemap).toContain('/projects/design-bugs-out</loc>');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
});

test('old /explore URLs redirect to the map and table', async ({ page }) => {
  await page.goto('/explore');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/explore/table');
  await expect(page).toHaveURL(/\/table$/);
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
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const first = page.locator('g.graph-node[tabindex="0"]');
    await expect(first).toHaveCount(1);
    await first.focus();
    const startLabel = await first.getAttribute('aria-label');
    await page.keyboard.press('ArrowRight');
    const focusedLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(focusedLabel).toBeTruthy();
    expect(focusedLabel).not.toBe(startLabel);
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

  test('the guide can be followed by keyboard alone', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const card = page.getByRole('region', { name: 'Design Bugs Out' });
    await card.getByRole('button', { name: 'Open Design Bugs Out' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#details-title')).toBeFocused();
    await expect(page.getByRole('region', { name: 'Follow a connection' })).toBeVisible();
    await page.getByRole('complementary').getByRole('button', { name: 'Personas' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#details-title')).toHaveText('Personas');
    await expect(page.getByRole('region', { name: 'Your path' })).toBeVisible();
    await page.getByRole('region', { name: 'Your path' }).getByRole('button', { name: 'Next' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Two ways to see it' })).toBeVisible();
    // Finished: not shown on the next visit.
    await page.getByRole('region', { name: 'Two ways to see it' }).getByRole('button', { name: 'Done' }).click();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('region', { name: 'Design Bugs Out' })).toHaveCount(0);
  });

  test('switching arrangement moves the same entries into columns and back', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const xOf = (id: string) =>
      page.locator(`g.graph-node[data-id="${id}"]`).evaluate((el) => (el as SVGGraphicsElement).transform.baseVal[0].matrix.e);
    const people = ['P001', 'P002', 'P003'];
    const before = await Promise.all(people.map(xOf));
    expect(new Set(before).size).toBeGreaterThan(1);
    await page.getByRole('radio', { name: 'By type' }).check({ force: true });
    await expect(page.getByRole('status')).toHaveText(/Arranged by type/);
    await expect.poll(async () => new Set(await Promise.all(people.map(xOf))).size).toBe(1);
    await page.getByRole('radio', { name: 'Constellation' }).check({ force: true });
    await expect.poll(async () => (await Promise.all(people.map(xOf))).join()).toBe(before.join());
    // Switching again mid-move turns round and still ends in the right place.
    await page.getByRole('radio', { name: 'By type' }).check({ force: true });
    await page.waitForTimeout(250);
    await page.getByRole('radio', { name: 'Constellation' }).check({ force: true });
    await expect.poll(async () => (await Promise.all(people.map(xOf))).join()).toBe(before.join());
  });

  test('search announces result count; Ctrl+E switches to the table', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('searchbox')).toBeFocused();
    await page.keyboard.type('inclusive');
    await expect(page.getByRole('status')).toHaveText(/13 entries match “inclusive”/);
    await page.keyboard.press('Control+e');
    await expect(page).toHaveURL(/\/table$/);
    await expect(page.getByRole('searchbox')).toHaveValue('inclusive');
    await expect(page.getByRole('status')).toHaveText('Showing the table view');
  });

  test('filters hide a type and are announced', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('checkbox', { name: /Partners/ }).uncheck();
    await expect(page.getByRole('status')).toHaveText(/Partners hidden\. 39 of 48 entries shown\./);
    await expect(page.locator('g.graph-node')).toHaveCount(39);
  });
});

test('narrow screen: details open as a sheet over the map, which stays usable', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile layout');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Open Design Bugs Out' }).click();
  const sheet = page.getByRole('complementary', { name: 'Details' });
  await expect(sheet).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // The selected entry is panned into the map above the sheet.
  const entry = await page.locator('g.graph-node[data-id="PR004"]').boundingBox();
  const sheetBox = await sheet.boundingBox();
  expect(entry!.y + entry!.height).toBeLessThan(sheetBox!.y);
  await sheet.getByRole('button', { name: 'Expand' }).click();
  await expect(sheet.getByRole('button', { name: 'Show the map' })).toHaveAttribute('aria-expanded', 'true');
  await sheet.getByRole('button', { name: 'Close details' }).click();
  await expect(sheet).toHaveCount(0);
});

test('narrow screen: the legend and filters fold away behind a button', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile layout');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const button = page.getByRole('button', { name: 'Filters' });
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('checkbox', { name: /Partners/ })).toBeHidden();
  await button.click();
  await page.getByRole('checkbox', { name: /Partners/ }).uncheck();
  await expect(page.getByRole('status')).toHaveText(/Partners hidden/);
});

test('touch targets on the map controls are at least 40px', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile layout');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  for (const name of ['Zoom in', 'Zoom out', 'Fit the whole map', 'Show the guide', 'Filters']) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box!.width, name).toBeGreaterThanOrEqual(40);
    expect(box!.height, name).toBeGreaterThanOrEqual(40);
  }
});

test('no horizontal scroll at 320px', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 320, height: 640 } });
  for (const route of ['/', '/projects', '/projects/design-bugs-out', '/table', '/about']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, route).toBeLessThanOrEqual(0);
  }
  await page.close();
});
