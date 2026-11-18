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
    { name: 'light', use: { colorScheme: 'light' }, testIgnore: /lobby-scenarios\.spec\.ts/ },
    // The behaviour checks do not depend on the theme: they run once, in light.
    { name: 'dark', use: { colorScheme: 'dark' }, testMatch: /walk\.spec\.ts/ },
    // WebKit, the engine of iOS's web view: the same walk (ids, every screen), behaviour and the Lobby's DOM order, no
    // pictures. Playwright cannot move a finger in WebKit, so the injected swipe is Chromium's only.
    { name: 'webkit', use: { browserName: 'webkit', colorScheme: 'light' }, testIgnore: /lobby-(swipe|scenarios)\.spec\.ts/ },
    // The GitHub Pages build as NthCase meets it: the same dist/ served under /nthcase-sample-ionic/, in Chromium,
    // played through scenarios 12–17 and 19 with a mouse, a wheel, touch and the browser's Back.
    {
      name: 'pages',
      use: { colorScheme: 'light', baseURL: 'http://localhost:4174/nthcase-sample-ionic/' },
      testMatch: /lobby-scenarios\.spec\.ts/,
    },
  ],
  webServer: [
    {
      // Serves dist/ as built by `npm run build`; nothing is rebuilt here.
      command: 'npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      // The same dist/ at the path GitHub Pages serves it from. The build's asset paths are relative (vite.config.ts).
      command: 'npx vite preview --port 4174 --strictPort --base /nthcase-sample-ionic/',
      url: 'http://localhost:4174/nthcase-sample-ionic/',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
