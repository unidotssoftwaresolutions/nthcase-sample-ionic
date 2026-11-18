import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
export const specIds: string[] = (JSON.parse(readFileSync(join(root, 'nthcase/test-ids.json'), 'utf8')) as { ids: { id: string }[] }).ids.map((e) => e.id);

/** Built only by the apps that build the Lobby twice, Android and iOS (SPEC.md §7). */
export const NOT_IN_THIS_APP = ['lab_lobby_views'];

/** The JSON id a concrete id belongs to ("shop_item_7" → "shop_item_{id}", "lobby_board_cell_m18" → "…_{col}{row}"). */
export function templateOf(id: string): string | undefined {
  return specIds.find((t) => {
    if (t === id) return true;
    const source = t
      .replace('{col}{row}', '[a-z](?:[1-9]|1\\d|2[0-6])')
      .replace(/\{(id|n|m|s)\}/g, '\\d+')
      .replace('{key}', '(kitchen|desk|garden|home)');
    return new RegExp(`^${source}$`).test(id);
  });
}

/**
 * Watches a page for what must never happen: a request that leaves the app, a Content-Security-Policy violation, a
 * script error. Returns the list to check at the end.
 */
export async function guard(page: Page): Promise<string[]> {
  const problems: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  page.on('request', (request) => {
    const url = request.url();
    if (!/^(http:\/\/localhost:417[34]\/|data:|about:|blob:)/.test(url)) problems.push(`request left the app: ${url}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  return problems;
}

/**
 * Every id in the real DOM right now, as Appium's WEBVIEW context finds them: `[data-testid]` in the document (CSS
 * does not enter shadow roots), and inside the care guide's frame. Each must also be its element's `id`, once.
 */
export async function idsOnScreen(page: Page): Promise<string[]> {
  const found: string[] = [];
  for (const frame of page.frames()) {
    const ids = await frame.evaluate(() => {
      const out: { id: string; agrees: boolean; count: number }[] = [];
      document.querySelectorAll('[data-testid]').forEach((el) => {
        const id = el.getAttribute('data-testid')!;
        out.push({ id, agrees: el.id === id, count: document.querySelectorAll(`[id="${id}"]`).length });
      });
      return out;
    });
    for (const { id, agrees, count } of ids) {
      expect(agrees, `${id}: id and data-testid agree`).toBe(true);
      expect(count, `${id}: one element only`).toBe(1);
      expect(templateOf(id), `${id} is a spec id`).toBeDefined();
      found.push(id);
    }
  }
  return found;
}

/** Waits until an Ionic overlay has finished opening. */
export async function presented(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector).first()).not.toHaveClass(/overlay-hidden/);
  await page.waitForTimeout(450); // the opening animation
}

/** Signs in, opens the Lab tab and its Lobby row (scenario steps 1 and 2). */
export async function openLobby(page: Page, at = '/'): Promise<void> {
  await page.goto(at);
  await signIn(page);
  await page.click('#nav_lab');
  await page.click('#lab_lobby');
  await expect(page.locator('#lobby_touch_log')).toHaveText('Nothing touched');
}

/** Where the Lobby's evidence files go: build/lobby/, beside the app, never committed. */
export const evidenceDir = join(root, 'build', 'lobby');

export async function signIn(page: Page): Promise<void> {
  await page.click('#signin_use_test_account');
  await page.click('#signin_submit');
  await expect(page.locator('#shop_screen')).toBeVisible();
}
