import { defineConfig } from '@playwright/test';

/**
 * End-to-end checks in a real browser engine (Playwright's own Chromium), against the production web build: the same
 * files Capacitor puts in the apps. 360 × 780 at 2×, the size round one drew its screenshots at, in light and dark.
 * These show the web layer only: no system prompt, status bar or native chrome.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    browserName: 'chromium',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'light', use: { colorScheme: 'light' } },
    // The behaviour checks do not depend on the theme: they run once, in light.
    { name: 'dark', use: { colorScheme: 'dark' }, testMatch: /walk\.spec\.ts/ },
    // WebKit, the engine of iOS's web view: the same walk (ids, every screen) and behaviour, no pictures.
    { name: 'webkit', use: { browserName: 'webkit', colorScheme: 'light' } },
  ],
  webServer: {
    // Serves dist/ as built by `npm run build`; nothing is rebuilt here.
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
