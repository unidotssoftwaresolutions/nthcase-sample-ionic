import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evidenceDir, openLobby } from './support';

/**
 * UiScrollable's swipe, injected as touches in Chromium (the engine of Android's web view), across the Top 10 row with
 * the pager off, across row 1 inside the page (pager off), and across the pager.
 *
 * The gesture is the one the Android round read from the UiAutomator2 server's bytecode
 * (docs/SAMPLE_APPS_LOBBY_SPEC_AND_ANDROID_REPORT.md §4): vertical, through the centre x of the scroller's visible
 * bounds, from 10 % below its top to 10 % above its bottom (scrollBackward), then 263 ms later the other way
 * (scrollForward). Each swipe is one touch down, 54 moves each followed by a pause of 5 ms (or 19 ms, the step the
 * Samsung's log showed), and one touch up. The touches go through the DevTools protocol's Input.dispatchTouchEvent,
 * which Chromium feeds to its own gesture detection: it decides tap, long press or scroll itself.
 *
 * Controls first: the same path, with a finger that does not travel, gives a tap, and one held still gives a long press,
 * so "nothing touched" below is the browser's decision, not a path that cannot touch.
 */

const STEPS = 55;
const GAP_MS = 263;

interface Seen {
  events: string[];
  log: string;
  count: string;
  sheet: boolean;
  panel: boolean;
  pageMoved: number;
  rowMoved: number;
  swipeMs: number[];
  down: string;
  cancelAfterMs: number | null;
  cancelAfterPx: number | null;
}

async function touchSession(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  return cdp;
}

/** Every pointer, touch and click event the page gets, on which id, with its time and y. */
async function listen(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { mgEvents: { type: string; on: string; t: number; y: number }[] };
    w.mgEvents = [];
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'touchcancel', 'click', 'dblclick', 'contextmenu']) {
      document.addEventListener(
        type,
        (event) => {
          const on = (event.target as Element).closest?.('[data-testid]')?.id ?? (event.target as Element).tagName;
          const y = 'clientY' in event ? (event as PointerEvent).clientY : (event as TouchEvent).changedTouches?.[0]?.clientY ?? -1;
          w.mgEvents.push({ type, on, t: event.timeStamp, y });
        },
        { capture: true, passive: true },
      );
    }
  });
}

async function pageTop(page: Page): Promise<number> {
  return page.evaluate(async () => (await (document.querySelector('#lobby_page') as HTMLIonContentElement).getScrollElement()).scrollTop);
}

/** One swipe: down, 54 moves each followed by `stepMs`, up. The moves are sent without waiting for each answer. */
async function swipeOnce(cdp: CDPSession, x: number, fromY: number, toY: number, stepMs: number): Promise<number> {
  const started = Date.now();
  const sent: Promise<unknown>[] = [cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: fromY }] })];
  for (let i = 1; i < STEPS; i++) {
    sent.push(cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: fromY + ((toY - fromY) * i) / STEPS }] }));
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  sent.push(cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }));
  await Promise.all(sent);
  return Date.now() - started;
}

/** UiScrollable's two swipes across one scroller, and what the Lobby made of them. */
async function uiScrollableSwipe(page: Page, scroller: string, stepMs: number): Promise<Seen> {
  const box = (await page.locator(`#${scroller}`).boundingBox())!;
  const viewport = page.viewportSize()!;
  const top = Math.max(box.y, 0);
  const bottom = Math.min(box.y + box.height, viewport.height);
  const x = Math.round(box.x + box.width / 2);
  const dead = (bottom - top) * 0.1;
  const down = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('[data-testid]')?.id ?? '', [x, top + dead]);
  const pageBefore = await pageTop(page);
  const rowBefore = await page.locator(`#${scroller}`).evaluate((el) => el.scrollLeft);
  await listen(page);
  const cdp = await touchSession(page);
  const swipeMs = [await swipeOnce(cdp, x, top + dead, bottom - dead, stepMs)];
  await page.waitForTimeout(GAP_MS);
  swipeMs.push(await swipeOnce(cdp, x, bottom - dead, top + dead, stepMs));
  await cdp.detach();
  // longer than a long press and a double tap, so anything pending has happened
  await page.waitForTimeout(1200);
  const raw = await page.evaluate(() => (window as unknown as { mgEvents: { type: string; on: string; t: number; y: number }[] }).mgEvents);
  // the first swipe's events, folded: runs of moves become one entry with their count
  const events: string[] = [];
  for (const e of raw) {
    const last = events[events.length - 1];
    const label = `${e.type} on ${e.on}`;
    if (e.type === 'pointermove' && last?.startsWith(label)) {
      const n = Number(/×(\d+)$/.exec(last)?.[1] ?? 1) + 1;
      events[events.length - 1] = `${label} ×${n}`;
    } else events.push(label);
  }
  const firstDown = raw.find((e) => e.type === 'pointerdown');
  const firstCancel = raw.find((e) => e.type === 'pointercancel');
  const movesBeforeCancel = firstCancel ? raw.filter((e) => e.type === 'pointermove' && e.t <= firstCancel.t && e.t >= firstDown!.t) : [];
  return {
    events,
    log: (await page.locator('#lobby_touch_log').textContent()) ?? '',
    count: (await page.locator('#lobby_touch_count').textContent()) ?? '',
    sheet: (await page.locator('#lobby_sheet').count()) > 0,
    panel: (await page.locator('#lobby_detail, #lobby_promo').count()) > 0,
    pageMoved: (await page.locator('#lobby_page').count()) ? (await pageTop(page)) - pageBefore : 0,
    rowMoved: (await page.locator(`#${scroller}`).count()) ? (await page.locator(`#${scroller}`).evaluate((el) => el.scrollLeft)) - rowBefore : 0,
    swipeMs,
    down,
    cancelAfterMs: firstCancel && firstDown ? Math.round(firstCancel.t - firstDown.t) : null,
    cancelAfterPx: firstCancel && movesBeforeCancel.length ? Math.round(Math.abs(movesBeforeCancel[movesBeforeCancel.length - 1].y - firstDown!.y)) : null,
  };
}

const results: string[] = [];

test.afterAll(() => {
  if (results.length === 0) return;
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, 'swipe.md'), `${results.join('\n')}\n`);
});

test.describe('the injected swipe (Chromium)', () => {
  test('controls: the same touch path taps, long-presses, and keeps a long press while the finger moves a little', async ({ page }) => {
    await openLobby(page);
    await page.click('#lobby_pager_shown');
    const box = (await page.locator('#lobby_top_row_tile_2').boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + 30;
    const cdp = await touchSession(page);
    // a tap: down and up in place
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('#lobby_detail')).toBeVisible();
    await expect(page.locator('#lobby_touch_log')).toHaveText('Tapped: Pocket Notebook (top row, tile 2)');
    await page.click('#lobby_detail_back');
    // a long press: held 800 ms, moving 4 px on the way (inside the browser's slop): it still fires at 500 ms
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 4; i++) {
      await page.waitForTimeout(100);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + i }] });
    }
    await page.waitForTimeout(400);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('#lobby_sheet')).toBeVisible();
    await expect(page.locator('#lobby_touch_log')).toContainText('Long-pressed: Pocket Notebook (top row, tile 2)');
    await expect(page.locator('#lobby_touch_count')).toHaveText('Touches: 2');
    await cdp.detach();
    results.push(
      '# The injected swipe, Chromium (build/lobby/swipe.md, written by e2e/lobby-swipe.spec.ts)',
      '',
      'Controls: a touch down and up in place on Top 10 tile 2 logged "Tapped" and opened the detail; a touch held 800 ms,',
      'moving 4 px, logged "Long-pressed" and opened the quick sheet.',
      '',
      '| Swipe across | step | the finger went down on | what the tile got | log | sheet / panel | page moved | swipe took |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
    );
  });

  for (const [scroller, pagerOn] of [
    ['lobby_top_row', false],
    ['lobby_row_1', false],
    ['lobby_pager', true],
  ] as const) {
    for (const stepMs of [5, 19]) {
      test(`${scroller}${pagerOn ? '' : ' (pager off)'}, ${stepMs} ms a step: the browser takes the drag, nothing is touched`, async ({ page }) => {
        await openLobby(page);
        if (!pagerOn) await page.click('#lobby_pager_shown');
        await page.waitForTimeout(300);
        const seen = await uiScrollableSwipe(page, scroller, stepMs);
        const where = `${scroller}${pagerOn ? '' : ' (pager off)'}`;
        const got = seen.events.filter((e) => e.includes(` on ${seen.down}`)).slice(0, 5).join(' → ');
        results.push(
          `| ${where} | ${stepMs} ms | ${seen.down} | ${got}; cancelled ${seen.cancelAfterMs} ms and ${seen.cancelAfterPx} px after down | ${seen.log.replace(/\n/g, ' / ')}, ${seen.count} | ${seen.sheet ? 'sheet' : 'no sheet'} / ${seen.panel ? 'panel' : 'no panel'} | ${seen.pageMoved} px | ${seen.swipeMs.join(' + ')} ms |`,
        );
        // the finger went down on a touchable element of that scroller, and the browser cancelled it before a long press
        expect(seen.down).toMatch(scroller === 'lobby_pager' ? /^lobby_banner_1$/ : new RegExp(`^${scroller}_tile_2$`));
        expect(seen.cancelAfterMs).not.toBeNull();
        expect(seen.cancelAfterMs!).toBeLessThan(500);
        expect(seen.events.some((e) => e.startsWith('click'))).toBe(false);
        expect(seen.events.some((e) => e.startsWith('pointerup'))).toBe(false);
        expect(seen.log).toBe('Nothing touched');
        expect(seen.count).toBe('Touches: 0');
        expect(seen.sheet).toBe(false);
        expect(seen.panel).toBe(false);
        expect(seen.rowMoved).toBe(0);
        // the page claims a vertical drag that starts on row 1; nothing claims one on the Top 10 row or the pager
        if (scroller === 'lobby_row_1') expect(seen.pageMoved).toBeGreaterThan(0);
        else expect(seen.pageMoved).toBe(0);
      });
    }
  }
});
