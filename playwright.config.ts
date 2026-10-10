import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

/**
 * End-to-end and accessibility tests against the production build.
 *
 * Browser: Playwright's bundled Chromium if installed (`npx playwright install
 * chromium`). If it cannot be downloaded, set CHROMIUM_PATH to a local
 * Chromium/Chrome binary; a known sandbox path is used as a fallback.
 */
const FALLBACK_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath =
  process.env.CHROMIUM_PATH ?? (fs.existsSync(FALLBACK_CHROMIUM) ? FALLBACK_CHROMIUM : undefined);

const PORT = Number(process.env.E2E_PORT ?? 3200);

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
