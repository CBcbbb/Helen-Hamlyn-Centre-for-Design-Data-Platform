/**
 * Captures the README/REPORT screenshots into docs/screenshots.
 * Needs a running production server: `npm run build && npm start`, then
 * `npx tsx scripts/screenshots.ts` (BASE_URL defaults to http://localhost:3000).
 * Uses CHROMIUM_PATH if Playwright's own Chromium isn't installed.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = path.resolve(__dirname, '..', 'docs', 'screenshots');
const FALLBACK = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = process.env.CHROMIUM_PATH ?? (fs.existsSync(FALLBACK) ? FALLBACK : undefined);

type Shot = { name: string; path: string; fullPage: boolean; prepare?: (page: import('@playwright/test').Page) => Promise<void> };
const SHOTS: Shot[] = [
  // First visit: the constellation with the guide's first card.
  { name: 'home', path: '/', fullPage: false },
  // Following connections: details open, path drawn on the map.
  {
    name: 'path',
    path: '/',
    fullPage: false,
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Open Design Bugs Out' }).click();
      await page.getByRole('complementary').getByRole('button', { name: 'Hua Dong' }).click();
      await page.getByRole('complementary').getByRole('button', { name: 'Research Associate Programme' }).click();
    },
  },
  // The same network arranged by type.
  {
    name: 'columns',
    path: '/',
    fullPage: false,
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Skip the guide' }).click();
      await page.getByRole('radio', { name: 'By type' }).check({ force: true });
      await page.waitForTimeout(1300);
    },
  },
  { name: 'table', path: '/table', fullPage: false },
  { name: 'project', path: '/projects/design-bugs-out', fullPage: true },
];
const WIDTHS = [1440, 390];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: width > 800 ? 900 : 844 }, deviceScaleFactor: 1 });
    for (const shot of SHOTS) {
      await page.context().clearCookies();
      await page.goto(BASE + shot.path, { waitUntil: 'networkidle' });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      if (shot.prepare) await shot.prepare(page);
      // Clicking inside the details sheet can scroll the window; show the map as a person would see it.
      if (!shot.fullPage) await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
      const file = path.join(OUT, `${shot.name}-${width}.png`);
      await page.screenshot({ path: file, fullPage: shot.fullPage });
      console.log(path.relative(process.cwd(), file));
    }
    await page.close();
  }
  await browser.close();
}

main();
