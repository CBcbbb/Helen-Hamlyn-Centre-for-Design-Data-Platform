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

const SHOTS: { name: string; path: string; fullPage: boolean }[] = [
  { name: 'home', path: '/', fullPage: true },
  { name: 'project', path: '/projects/design-bugs-out', fullPage: true },
  { name: 'explore', path: '/explore', fullPage: false },
];
const WIDTHS = [1440, 390];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: width > 800 ? 900 : 844 }, deviceScaleFactor: 1 });
    for (const shot of SHOTS) {
      await page.goto(BASE + shot.path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const file = path.join(OUT, `${shot.name}-${width}.png`);
      await page.screenshot({ path: file, fullPage: shot.fullPage });
      console.log(path.relative(process.cwd(), file));
    }
    await page.close();
  }
  await browser.close();
}

main();
