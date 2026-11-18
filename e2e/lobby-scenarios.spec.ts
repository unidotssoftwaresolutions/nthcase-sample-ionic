import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evidenceDir, guard } from './support';

/**
 * The GitHub Pages build as NthCase's web engine meets it: the production dist/ served under /nthcase-sample-ionic/,
 * in Chromium at 360 × 780. Scenarios 12–17 and 19 (nthcase/scenarios) are played step by step with what a person at a
 * browser has: clicks, a held mouse button, a mouse wheel, touches, and the browser's Back. 18 and 20 are for the
 * Lobby built twice, which only Android and iOS have.
 */

const log = (page: Page) => page.locator('#lobby_touch_log');
const count = (page: Page) => page.locator('#lobby_touch_count');

/** Scenario steps 1 and 2: sign in with the scenario's account, open the Lab tab and the Lobby. */
async function steps1and2(page: Page): Promise<void> {
  await page.goto('./');
  await page.fill('#signin_email', 'tester@mossgrove.test');
  await page.fill('#signin_password', 'Mossgrove123');
  await page.click('#signin_submit');
  await expect(page.locator('#shop_screen')).toBeVisible();
  await expect(page.getByText('Stoneware Mug')).toBeVisible();
  await page.click('#nav_lab');
  await page.click('#lab_lobby');
  await expect(log(page)).toHaveText('Nothing touched');
}

/**
 * A person's mouse wheel over an element, a notch at a time, until `done` holds. Over the page the pointer rests in
 * its left margin, 8 px in, where no inner scroller is: a wheel over the board or the inner list moves that first.
 */
async function wheelOver(page: Page, over: Locator, dx: number, dy: number, done: () => Promise<boolean>, max = 60): Promise<number> {
  const margin = (await over.getAttribute('id')) === 'lobby_page';
  for (let n = 0; n < max; n++) {
    if (await done()) return n;
    const box = (await over.boundingBox())!;
    await page.mouse.move(margin ? box.x + 8 : box.x + box.width / 2, box.y + Math.min(box.height / 2, 120));
    await page.mouse.wheel(dx, dy);
    await page.waitForTimeout(120);
  }
  throw new Error(`still not there after ${max} notches`);
}

/** Whether an element is wholly inside the window and inside each scroller around it. */
async function wholly(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) return false;
    let at: Element | null = el.parentElement;
    while (at) {
      const s = at.getBoundingClientRect();
      const style = getComputedStyle(at);
      if (/(auto|scroll|hidden)/.test(style.overflow) && (r.top < s.top - 0.5 || r.bottom > s.bottom + 0.5 || r.left < s.left - 0.5 || r.right > s.right + 0.5)) return false;
      at = at.parentElement ?? ((at.getRootNode() as ShadowRoot).host ?? null);
    }
    return true;
  });
}

/** The board's position line wholly in view, and at least 150 px of the board under it. */
async function boardInView(page: Page): Promise<boolean> {
  if (!(await wholly(page.locator('#lobby_board_position')))) return false;
  const board = (await page.locator('#lobby_board').boundingBox())!;
  const scroller = (await page.locator('#lobby_page').boundingBox())!;
  return scroller.y + scroller.height - board.y >= 150;
}

/** A touch drag through Chromium's input (the DevTools protocol), as a finger on a phone. */
async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 20, stepMs = 16): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }],
    });
    await page.waitForTimeout(stepMs);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  await cdp.detach();
}

const notes: string[] = [];
test.afterAll(() => {
  if (notes.length === 0) return;
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, 'pages.md'), `# The Pages build at /nthcase-sample-ionic/ (e2e/lobby-scenarios.spec.ts)\n\n${notes.join('\n')}\n`);
});

test.describe('the Pages build: scenarios 12–19', () => {
  test.describe.configure({ timeout: 90_000 });

  test('loads at /nthcase-sample-ionic/ with every file from that path', async ({ page }) => {
    const problems = await guard(page);
    const asked: string[] = [];
    page.on('request', (r) => asked.push(new URL(r.url()).pathname));
    await page.goto('./');
    await expect(page.locator('#signin_screen')).toBeVisible();
    expect(asked.filter((p) => !p.startsWith('/nthcase-sample-ionic/'))).toEqual([]);
    expect(problems).toEqual([]);
    notes.push(`- Loaded ${asked.length} files, all under /nthcase-sample-ionic/.`);
  });

  test('12 · scroll the page down and back up: nothing touched', async ({ page }) => {
    await steps1and2(page);
    const pageEl = page.locator('#lobby_page');
    const down = await wheelOver(page, pageEl, 0, 300, () => wholly(page.locator('#lobby_footer')));
    await expect(page.getByText('End of the lobby')).toBeVisible();
    await expect(log(page)).toHaveText('Nothing touched');
    const up = await wheelOver(page, pageEl, 0, -300, () => wholly(page.locator('#lobby_row_1_position')));
    await expect(page.locator('#lobby_row_1_position')).toContainText('Row 1');
    await expect(log(page)).toHaveText('Nothing touched');
    await expect(count(page)).toHaveText('Touches: 0');
    notes.push(`- 12: ${down} wheel notches down to the footer and ${up} back up to "Row 1", over the page; log "Nothing touched".`);
  });

  test('13 · a tile deep in row 3: scroll, tap, back, long press, the browser’s Back', async ({ page }) => {
    await steps1and2(page);
    await wheelOver(page, page.locator('#lobby_page'), 0, 200, () => wholly(page.locator('#lobby_row_3')));
    await expect(page.locator('#lobby_row_3_position')).toContainText('Row 3');
    await expect(log(page)).toHaveText('Nothing touched');
    // a wheel's sideways turn (a trackpad, or Shift with a mouse wheel) moves the row
    const row3 = page.locator('#lobby_row_3');
    const tile = page.locator('#lobby_row_3_tile_15');
    const notches = await wheelOver(page, row3, 200, 0, () => wholly(tile));
    await expect(page.getByText('Bedside Lamp').first()).toBeVisible();
    await expect(log(page)).toHaveText('Nothing touched');
    await tile.click();
    await expect(page.locator('#lobby_detail')).toContainText('Bedside Lamp');
    await expect(page.locator('#lobby_detail')).toContainText('Row 3, tile 15');
    await expect(log(page)).toHaveText('Tapped: Bedside Lamp (row 3, tile 15)');
    await page.click('#lobby_detail_back');
    // row 3 kept its place
    await expect(tile).toBeVisible();
    // (the row's place goes back a frame after the page has drawn)
    await expect.poll(() => wholly(tile), { timeout: 2000 }).toBe(true);
    // a long press with the mouse: held 700 ms
    const box = (await tile.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 40);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();
    await expect(page.locator('#lobby_sheet')).toBeVisible();
    for (const text of ['Open', 'Preview', 'Saved', 'Rate']) await expect(page.locator('#lobby_sheet')).toContainText(text);
    // "Press Back": the browser's Back closes the sheet
    const before = page.url();
    await page.goBack();
    await expect(page.locator('#lobby_sheet')).toHaveCount(0);
    expect(page.url()).not.toBe(before);
    await expect(log(page)).toHaveText('Long-pressed: Bedside Lamp (row 3, tile 15)\nTapped: Bedside Lamp (row 3, tile 15)');
    await expect(count(page)).toHaveText('Touches: 2');
    notes.push(`- 13: row 3 reached tile 15 in ${notches} sideways notches; tap, Back to the lobby, a 700 ms press, and the browser's Back (address ${before} → ${page.url()}) closed the sheet.`);
  });

  test('14 · the board both ways, with the wheel; tap and double-click M18', async ({ page }) => {
    await steps1and2(page);
    // the page shows 262 px under the fixed rows, less than the board's 280: the step ends with the position line and
    // the board's top in view
    await wheelOver(page, page.locator('#lobby_page'), 0, 150, () => boardInView(page));
    await expect(page.locator('#lobby_board_position')).toHaveText('Board: top-left A1');
    await expect(log(page)).toHaveText('Nothing touched');
    const board = page.locator('#lobby_board');
    const cell = page.locator('#lobby_board_cell_m18');
    await wheelOver(page, board, 120, 0, async () => (await board.evaluate((el) => el.scrollLeft)) >= 9 * 56);
    await wheelOver(page, board, 0, 120, () => wholly(cell));
    expect(await wholly(cell)).toBe(true);
    await expect(log(page)).toHaveText('Nothing touched');
    await cell.click();
    await expect(log(page)).toHaveText('Tapped: M18 (board)');
    await cell.dblclick();
    await expect(log(page)).toContainText('Double-tapped: M18 (board)');
    await expect(count(page)).toHaveText('Touches: 2');
    notes.push(`- 14: the board moved both ways under the wheel to "${await page.locator('#lobby_board_position').textContent()}"; click, then double-click, gave two lines.`);
  });

  test('15 · the pager, one banner at a time, by touch and by the wheel', async ({ page }) => {
    await steps1and2(page);
    await expect(page.locator('#lobby_pager_position')).toHaveAttribute('aria-label', 'Banner 1 of 5');
    const pager = page.locator('#lobby_pager');
    const box = (await pager.boundingBox())!;
    const y = box.y + box.height / 2;
    // swipe left by touch, twice
    for (const banner of [2, 3]) {
      await touchDrag(page, { x: box.x + box.width * 0.8, y }, { x: box.x + box.width * 0.2, y });
      await expect(page.locator('#lobby_pager_position')).toHaveAttribute('aria-label', `Banner ${banner} of 5`);
      await expect(log(page)).toHaveText('Nothing touched');
    }
    // and once with the wheel turned sideways: the strip snaps to the banner nearest where the wheel left it, so a
    // sideways wheel moves one banner when it travels more than half of one (here 200 of 360 px)
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.wheel(200, 0);
    await expect(page.locator('#lobby_pager_position')).toHaveAttribute('aria-label', 'Banner 4 of 5');
    await expect(page.getByText('Candles for long evenings')).toBeVisible();
    await expect(log(page)).toHaveText('Nothing touched');
    await page.click('#lobby_banner_4');
    await expect(page.locator('#lobby_promo')).toContainText('Candles for long evenings');
    await expect(page.locator('#lobby_promo')).toContainText('Banner 4 of 5');
    await expect(log(page)).toHaveText('Tapped: Candles for long evenings (banner 4)');
    // NthCase's web "swipe" is a 600 px wheel: from banner 1 it leaves the strip nearer banner 3 than banner 2
    await page.click('#lobby_promo_back');
    await page.locator('#lobby_pager').evaluate((el) => el.scrollTo({ left: 0 }));
    await expect(page.locator('#lobby_pager_position')).toHaveAttribute('aria-label', 'Banner 1 of 5');
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.wheel(600, 0);
    await page.waitForTimeout(800);
    const after600 = await page.locator('#lobby_pager_position').getAttribute('aria-label');
    await expect(log(page)).toHaveText('Tapped: Candles for long evenings (banner 4)');
    notes.push(
      `- 15: two touch swipes and a 200 px sideways wheel moved the pager a banner each; the tap on banner 4 opened its promo. A 600 px sideways wheel (NthCase's web swipe) from banner 1 ended on "${after600}".`,
    );
  });

  for (const [n, delay, pagerOff] of [
    [16, 12, false],
    [17, 3, false],
    [19, 12, true],
  ] as const) {
    test(`${n} · Saved after ${delay} s${pagerOff ? ', the pager off' : ''}: the tap waits for it, nothing else is touched`, async ({ page }) => {
      await steps1and2(page);
      await expect(page.locator('#lobby_bar')).toContainText('Saved');
      if (pagerOff) {
        await page.click('#lobby_pager_shown');
        await expect(page.locator('#lobby_pager')).toHaveCount(0);
        await expect(page.locator('#lobby_top_row')).toBeVisible();
        await expect(log(page)).toHaveText('Nothing touched');
      }
      await page.click(`#lobby_saved_delay_${delay}`);
      const chosen = Date.now();
      if (delay > 3) await expect(page.locator('#lobby_bar_saved')).toHaveCount(0);
      await expect(log(page)).toHaveText('Nothing touched');
      // the tap's own wait, as a person waits for the control to show
      await page.click('#lobby_bar_saved', { timeout: delay * 1000 + 5000 });
      const waited = Date.now() - chosen;
      await expect(page.locator('#lobby_saved_screen')).toHaveText('Saved: nothing yet');
      await expect(log(page)).toHaveText('Tapped: Saved (bar)');
      await expect(count(page)).toHaveText('Touches: 1');
      expect(waited).toBeGreaterThanOrEqual(delay * 1000 - 100);
      notes.push(`- ${n}: Saved came ${waited} ms after the choice of ${delay} s; one line, "Tapped: Saved (bar)".`);
    });
  }

  test('the rows and the board scroll with a mouse wheel and with touch; neither is a touch', async ({ page }) => {
    await steps1and2(page);
    const row1 = page.locator('#lobby_row_1');
    const left = () => row1.evaluate((el) => el.scrollLeft);
    // wheel, sideways
    let box = (await row1.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 50);
    await page.mouse.wheel(150, 0);
    await expect.poll(left).toBeGreaterThan(100);
    await expect(page.locator('#lobby_row_1_position')).not.toHaveText('Row 1: tiles 1–3 of 20');
    // touch, a finger dragged right to left
    const before = await left();
    box = (await row1.boundingBox())!;
    await touchDrag(page, { x: box.x + 300, y: box.y + 50 }, { x: box.x + 60, y: box.y + 50 });
    await expect.poll(left).toBeGreaterThan(before + 150);
    // the Top 10 row, by touch
    const top = page.locator('#lobby_top_row');
    const tb = (await top.boundingBox())!;
    await touchDrag(page, { x: tb.x + 300, y: tb.y + 30 }, { x: tb.x + 60, y: tb.y + 30 });
    await expect.poll(() => top.evaluate((el) => el.scrollLeft)).toBeGreaterThan(150);
    await expect(page.locator('#lobby_top_row_position')).not.toHaveText('Top 10: tiles 1–3 of 10');
    // the board: the wheel down and sideways, then a diagonal finger. With the pager off the page shows 402 px, so the
    // whole board fits under the finger.
    await page.click('#lobby_pager_shown');
    await wheelOver(page, page.locator('#lobby_page'), 0, 150, () => wholly(page.locator('#lobby_board')));
    const board = page.locator('#lobby_board');
    const at = () => board.evaluate((el) => [el.scrollLeft, el.scrollTop]);
    const bb = (await board.boundingBox())!;
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await page.mouse.wheel(0, 120);
    await page.mouse.wheel(120, 0);
    await expect.poll(at).toEqual([120, 120]);
    await touchDrag(page, { x: bb.x + 240, y: bb.y + 240 }, { x: bb.x + 40, y: bb.y + 40 });
    const [x, y] = await at();
    expect(x).toBeGreaterThan(250);
    expect(y).toBeGreaterThan(250);
    // a shallow diagonal is railed to its main axis by Chromium: only the board's x moves
    await touchDrag(page, { x: bb.x + 240, y: bb.y + 200 }, { x: bb.x + 100, y: bb.y + 140 });
    const [x2, y2] = await at();
    expect(x2).toBeGreaterThan(x + 100);
    expect(y2).toBe(y);
    await expect(page.locator('#lobby_board_position')).not.toHaveText('Board: top-left A1');
    await expect(log(page)).toHaveText('Nothing touched');
    notes.push(
      `- Rows and board: the wheel and a finger moved row 1, the Top 10 row and the board; a 45° finger moved the board to (${x}, ${y}) px; a shallow one (140 across, 60 up) moved only x, to (${x2}, ${y2}): Chromium's scroll rails. The log stayed "Nothing touched".`,
    );
  });

  test('a wheel at the middle of the window, as NthCase’s web scroll turns it, lands on the Top 10 row with the pager on', async ({ page }) => {
    await steps1and2(page);
    const viewport = page.viewportSize()!;
    const middle = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-testid]')?.id, [viewport.width / 2, viewport.height / 2]);
    const pageTop = () => page.evaluate(async () => (await (document.querySelector('#lobby_page') as HTMLIonContentElement).getScrollElement()).scrollTop);
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
    const withPager = await pageTop();
    await page.click('#lobby_pager_shown');
    const middleOff = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-testid]')?.id, [viewport.width / 2, viewport.height / 2]);
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
    const withoutPager = await pageTop();
    expect(middle).toMatch(/^lobby_top_row/);
    expect(withPager).toBe(0);
    expect(withoutPager).toBeGreaterThan(0);
    await expect(log(page)).toHaveText('Nothing touched');
    notes.push(
      `- A 600 px wheel at the window's middle (${viewport.width / 2}, ${viewport.height / 2}) lands on ${middle} with the pager on and scrolls nothing; with it off it lands on ${middleOff} and the page moves ${withoutPager} px. Touches: 0 either way.`,
    );
  });

  test('the browser’s Back walks the app back, then leaves it', async ({ page }) => {
    await steps1and2(page);
    const start = page.url();
    await page.click('#lobby_bar_offers');
    await page.click('#lobby_top_row_tile_1');
    await expect(page.locator('#lobby_detail')).toBeVisible();
    await page.goBack();
    await expect(page.locator('#lobby_detail')).toHaveCount(0);
    await expect(page.locator('#lobby_top_row')).toBeVisible();
    await page.goBack();
    await expect(page.locator('#lab_screen')).toBeVisible();
    await page.goBack();
    await expect(page.locator('#shop_screen')).toBeVisible();
    // the Shop is the bottom of the app's stack: nothing of the app's is left in the history
    expect(page.url()).not.toContain('#back');
    expect(start).toContain('#back');
  });
});
