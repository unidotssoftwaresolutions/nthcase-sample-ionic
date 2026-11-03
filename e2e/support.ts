import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
export const specIds: string[] = (JSON.parse(readFileSync(join(root, 'nthcase/test-ids.json'), 'utf8')) as { ids: { id: string }[] }).ids.map((e) => e.id);

/** The JSON id a concrete id belongs to ("shop_item_7" → "shop_item_{id}"). */
export function templateOf(id: string): string | undefined {
  return specIds.find((t) => t === id || new RegExp(`^${t.replace(/\{(id|n)\}/, '\\d+').replace('{key}', '(kitchen|desk|garden|home)')}$`).test(id));
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
    if (!/^(http:\/\/localhost:4173\/|data:|about:|blob:)/.test(url)) problems.push(`request left the app: ${url}`);
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

export async function signIn(page: Page): Promise<void> {
  await page.click('#signin_use_test_account');
  await page.click('#signin_submit');
  await expect(page.locator('#shop_screen')).toBeVisible();
}
