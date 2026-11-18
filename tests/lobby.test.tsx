import { act, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  boardTopLeft,
  fullyVisibleTiles,
  gridItem,
  logText,
  logTouch,
  EMPTY_LOG,
  rowPosition,
  tileItem,
  topItem,
  topRowPosition,
} from '../src/data/lobby';
import { getState, push, switchTab } from '../src/data/store';
import { DOUBLE_TAP_MS, LONG_PRESS_MS } from '../src/screens/Lobby';
import { fakePlatform } from './fakePlatform';
import { byId, gone, pause, presented, signedIn, tap, text } from './helpers';

/** Opens the Lobby the way scenario step 2 does: the Lab tab, then its row. */
async function openLobby(): Promise<void> {
  await signedIn();
  await act(async () => switchTab('lab'));
  await tap('lab_lobby');
  await byId('lobby_screen');
}

/**
 * Under Vitest's fake timers, Testing Library's waits never end (each one waits on a setTimeout that is faked), so
 * the steps that run on the fake clock reach the DOM directly.
 */
function el(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} is not on screen`);
  return found;
}

async function click(id: string): Promise<void> {
  await act(async () => {
    fireEvent.click(el(id));
  });
}

/** One touch, as the browser sends it: down, then up and the click after LONG_PRESS_MS has not passed. */
async function press(id: string, holdMs = 50, { moveBy = 0 } = {}): Promise<void> {
  const target = el(id);
  await act(async () => {
    fireEvent.pointerDown(target, { button: 0, pointerId: 1, pointerType: 'touch' });
  });
  if (moveBy) {
    await act(async () => {
      fireEvent.pointerMove(target, { button: 0, pointerId: 1, pointerType: 'touch', clientY: moveBy });
    });
  }
  await act(async () => {
    vi.advanceTimersByTime(holdMs);
  });
  await act(async () => {
    fireEvent.pointerUp(target, { button: 0, pointerId: 1, pointerType: 'touch' });
    if (holdMs < LONG_PRESS_MS) fireEvent.click(target);
  });
}

async function wait(ms: number): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

function logNow(): string {
  return document.getElementById('lobby_touch_log')!.textContent!;
}

describe('the Lobby, its words and numbers (SPEC.md §5)', () => {
  it('fills the rows from the catalogue as the spec says', () => {
    expect(tileItem(2, 1).name).toBe('Espresso Cup Pair');
    expect(tileItem(3, 15).name).toBe('Bedside Lamp');
    expect(tileItem(3, 15).id).toBe(35);
    expect(topItem(1).name).toBe('Tea Mug');
    expect(topItem(2).name).toBe('Pocket Notebook');
    expect(topItem(10).name).toBe('Fruit Bowl');
    expect(gridItem(1).id).toBe(29);
    expect(gridItem(12).id).toBe(40);
  });

  it('keeps three lines, newest first, and counts every touch', () => {
    let log = EMPTY_LOG;
    expect(logText(log)).toBe('Nothing touched');
    for (const n of [1, 2, 3, 4]) log = logTouch(log, 'Tapped', `Line ${n}`, 'inner list');
    expect(log.lines).toEqual(['Tapped: Line 4 (inner list)', 'Tapped: Line 3 (inner list)', 'Tapped: Line 2 (inner list)']);
    expect(log.count).toBe(4);
  });

  it('names the fully visible tiles and the board corner', () => {
    expect(fullyVisibleTiles(0, 360, 20)).toEqual([1, 3]);
    expect(rowPosition(2, 1, 3)).toBe('Row 2: tiles 1–3 of 20');
    expect(rowPosition(2, 4, 4)).toBe('Row 2: tile 4 of 20');
    expect(topRowPosition(...fullyVisibleTiles(0, 360, 10))).toBe('Top 10: tiles 1–3 of 10');
    // row 3 scrolled until tile 15 is whole at the right edge
    const [, last] = fullyVisibleTiles(16 + 15 * 108 - 8 - 360 + 16, 360, 20);
    expect(last).toBe(15);
    expect(boardTopLeft(0, 0)).toEqual([1, 1]);
    expect(boardTopLeft(12 * 56, 17 * 56)).toEqual([13, 18]);
    expect(boardTopLeft(12 * 56 + 1, 0)).toEqual([14, 1]);
  });
});

describe('the Lobby on screen', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens from the Lab with an empty log, Saved in the bar and the pager first', async () => {
    await openLobby();
    expect(await text('top_bar_title')).toBe('Lobby');
    expect(logNow()).toBe('Nothing touched');
    expect(await text('lobby_touch_count')).toBe('Touches: 0');
    expect(await text('lobby_pager_position')).toContain('Banner 1 of 5');
    expect(document.getElementById('lobby_pager_position')!.getAttribute('aria-label')).toBe('Banner 1 of 5');
    expect(await text('lobby_top_row_position')).toBe('Top 10: tiles 1–3 of 10');
    expect(await text('lobby_row_2_position')).toBe('Row 2: tiles 1–3 of 20');
    expect(await text('lobby_board_position')).toBe('Board: top-left A1');
    expect(document.getElementById('lobby_bar_saved')).not.toBeNull();
    // the pager, the Top 10 row and the page, in that order in the DOM; the page holds the rest
    const order = ['lobby_pager', 'lobby_top_row', 'lobby_page', 'lobby_chips', 'lobby_row_1', 'lobby_inner_list', 'lobby_board', 'lobby_bar'];
    const els = order.map((id) => document.getElementById(id)!);
    for (let i = 1; i < els.length; i++) {
      expect(els[i - 1].compareDocumentPosition(els[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `${order[i - 1]} before ${order[i]}`).toBeTruthy();
    }
    const page = document.getElementById('lobby_page')!;
    expect(page.tagName).toBe('ION-CONTENT');
    for (const id of ['lobby_chips', 'lobby_row_4', 'lobby_grid', 'lobby_inner_list', 'lobby_board', 'lobby_footer']) {
      expect(page.contains(document.getElementById(id)), `${id} is in the page`).toBe(true);
    }
    for (const id of ['lobby_pager', 'lobby_top_row', 'lobby_touch_log', 'lobby_bar']) {
      expect(page.contains(document.getElementById(id)), `${id} is outside the page`).toBe(false);
    }
  });

  it('takes the pager and its position line out of the DOM when Show the pager is off, and keeps the choice', async () => {
    await openLobby();
    const toggle = await byId('lobby_pager_shown');
    expect(toggle.tagName).toBe('ION-TOGGLE');
    await act(async () => {
      toggle.dispatchEvent(new CustomEvent('ionChange', { detail: { checked: false }, bubbles: true }));
    });
    await gone('lobby_pager');
    for (const id of ['lobby_pager_position', 'lobby_pager_auto', 'lobby_banner_1', 'lobby_banner_5']) expect(document.getElementById(id), id).toBeNull();
    expect(document.querySelector('.mg-lobby-pager')).toBeNull();
    // with the pager gone, the Top 10 row is the first scroller in the DOM
    expect(document.getElementById('lobby_top_row')).not.toBeNull();
    expect(logNow()).toBe('Nothing touched');
    expect(getState().lobbyPagerShown).toBe(false);
    // leave and come back: still off
    await tap('top_bar_back');
    await tap('lab_lobby');
    await byId('lobby_top_row');
    expect(document.getElementById('lobby_pager')).toBeNull();
  });

  it('leaves Saved out of the DOM until its delay has passed, counting again from each choice', async () => {
    await openLobby();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await click('lobby_saved_delay_12');
    expect(getState().lobbySavedDelay).toBe(12);
    expect(document.getElementById('lobby_bar_saved')).toBeNull();
    expect(document.querySelectorAll('#lobby_bar ion-tab-button')).toHaveLength(3);
    await wait(11_800);
    expect(document.getElementById('lobby_bar_saved')).toBeNull();
    await wait(400);
    expect(document.getElementById('lobby_bar_saved')).not.toBeNull();
    // choosing again starts the count again, even the same choice
    await wait(1_000);
    await click('lobby_saved_delay_3');
    expect(document.getElementById('lobby_bar_saved')).toBeNull();
    await wait(2_000);
    await click('lobby_saved_delay_3');
    await wait(2_900);
    expect(document.getElementById('lobby_bar_saved')).toBeNull();
    await wait(200);
    expect(document.getElementById('lobby_bar_saved')).not.toBeNull();
    // the choice is kept; the Lobby opened again counts from its opening
    await click('top_bar_back');
    await click('lab_lobby');
    expect(document.getElementById('lobby_bar_saved')).toBeNull();
    await wait(3_100);
    expect(document.getElementById('lobby_bar_saved')).not.toBeNull();
    expect(logNow()).toBe('Nothing touched');
  });

  it('logs a tap once the double-tap time has passed, a double tap as one line, and a long press', async () => {
    await openLobby();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    // a tap on a grid cell: nothing until DOUBLE_TAP_MS has passed
    await press('lobby_grid_cell_5');
    expect(logNow()).toBe('Nothing touched');
    await wait(DOUBLE_TAP_MS);
    expect(logNow()).toBe(`Tapped: ${gridItem(5).name} (grid, cell 5)`);
    // a double tap on a board cell
    await press('lobby_board_cell_m18');
    await wait(100);
    await press('lobby_board_cell_m18');
    await wait(DOUBLE_TAP_MS + 50);
    expect(logNow().split('\n')[0]).toBe('Double-tapped: M18 (board)');
    // a long press on an inner line, the finger moving inside it: movement alone does not cancel it
    await press('lobby_inner_row_7', LONG_PRESS_MS + 100, { moveBy: 30 });
    await wait(DOUBLE_TAP_MS + 50);
    expect(logNow().split('\n')[0]).toBe('Long-pressed: Line 7 (inner list)');
    // a chip
    await press('lobby_chip_3');
    await wait(DOUBLE_TAP_MS);
    expect(logNow().split('\n')[0]).toBe('Tapped: Desk (chip 3)');
    expect(document.getElementById('lobby_chip_3')!.getAttribute('aria-pressed')).toBe('true');
    expect(el('lobby_touch_count').textContent).toBe('Touches: 4');
    expect(logNow().split('\n')).toHaveLength(3);
    await click('lobby_touch_reset');
    expect(logNow()).toBe('Nothing touched');
    expect(el('lobby_touch_count').textContent).toBe('Touches: 0');
  });

  it('drops a long press when the browser cancels the pointer (it took the drag for a scroll)', async () => {
    await openLobby();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const tile = el('lobby_top_row_tile_2');
    await act(async () => {
      fireEvent.pointerDown(tile, { button: 0, pointerId: 1, pointerType: 'touch' });
    });
    await wait(200);
    await act(async () => {
      fireEvent.pointerCancel(tile, { pointerId: 1, pointerType: 'touch' });
    });
    await wait(LONG_PRESS_MS + DOUBLE_TAP_MS);
    expect(logNow()).toBe('Nothing touched');
    expect(document.getElementById('lobby_sheet')).toBeNull();
  });

  it('13 · a tile opens its detail, Back keeps the row, a long press opens the sheet, Back closes it', async () => {
    await openLobby();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await press('lobby_row_3_tile_15');
    await wait(DOUBLE_TAP_MS);
    vi.useRealTimers();
    const detail = await byId('lobby_detail');
    expect(detail.textContent).toContain('Bedside Lamp');
    expect(detail.textContent).toContain('Row 3, tile 15');
    expect(detail.textContent).toContain('No. 035');
    expect(logNow()).toBe('Tapped: Bedside Lamp (row 3, tile 15)');
    // the panel takes the place of the pager, the Top 10 row and the page; the log, the choice and the bar stay
    for (const id of ['lobby_pager', 'lobby_top_row', 'lobby_page']) expect(document.getElementById(id), id).toBeNull();
    for (const id of ['lobby_touch_log', 'lobby_saved_delay', 'lobby_bar']) expect(document.getElementById(id), id).not.toBeNull();
    await tap('lobby_detail_back');
    await byId('lobby_row_3_tile_15');

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await press('lobby_row_3_tile_15', LONG_PRESS_MS + 50);
    vi.useRealTimers();
    await presented('ion-modal.mg-lobby-sheet');
    expect(await text('lobby_sheet_title')).toBe('Bedside Lamp');
    for (const id of ['lobby_sheet_open', 'lobby_sheet_preview', 'lobby_sheet_saved', 'lobby_sheet_rate']) await byId(id);
    expect((await byId('lobby_sheet_saved')).textContent).toBe('Saved');
    // Android's system Back closes the sheet, with no log line
    await act(async () => fakePlatform.pressBack());
    await gone('lobby_sheet');
    expect(logNow()).toBe('Long-pressed: Bedside Lamp (row 3, tile 15)\nTapped: Bedside Lamp (row 3, tile 15)');
    expect(await text('lobby_touch_count')).toBe('Touches: 2');
    // Back again leaves the Lobby
    await act(async () => fakePlatform.pressBack());
    await byId('lab_screen');
  });

  it('logs the sheet buttons and opens what Open opens; Back closes a detail before it leaves', async () => {
    await openLobby();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await press('lobby_top_row_tile_2', LONG_PRESS_MS + 50);
    vi.useRealTimers();
    await presented('ion-modal.mg-lobby-sheet');
    expect(await text('lobby_sheet_title')).toBe('Pocket Notebook');
    await tap('lobby_sheet_open');
    const detail = await byId('lobby_detail');
    expect(detail.textContent).toContain('Top 10, tile 2');
    expect(logNow().split('\n')[0]).toBe('Tapped: Open (quick sheet, Pocket Notebook)');
    await act(async () => fakePlatform.pressBack());
    await byId('lobby_top_row');
    expect(document.getElementById('lobby_screen')).not.toBeNull();
  });

  it('15 · a banner opens its promo; the bar logs its taps and Saved shows its panel', async () => {
    await openLobby();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await press('lobby_banner_4');
    await wait(DOUBLE_TAP_MS);
    vi.useRealTimers();
    const promo = await byId('lobby_promo');
    expect(promo.textContent).toContain('Candles for long evenings');
    expect(promo.textContent).toContain('Banner 4 of 5');
    expect(promo.textContent).toContain('A test banner. Nothing here is for sale.');
    expect(logNow()).toBe('Tapped: Candles for long evenings (banner 4)');
    await tap('lobby_promo_back');
    await tap('lobby_bar_saved');
    expect(await text('lobby_saved_screen')).toBe('Saved: nothing yet');
    expect(logNow().split('\n')[0]).toBe('Tapped: Saved (bar)');
    await tap('lobby_bar_home');
    await byId('lobby_page');
    expect(await text('lobby_touch_count')).toBe('Touches: 3');
  });

  it('starts fresh on each visit: the log, the chips and the panels', async () => {
    await openLobby();
    await tap('lobby_bar_live');
    expect(await text('lobby_touch_count')).toBe('Touches: 1');
    await act(async () => push({ name: 'shop' }));
    await act(async () => switchTab('lab'));
    await tap('lab_lobby');
    expect(logNow()).toBe('Nothing touched');
    expect(document.getElementById('lobby_chip_1')!.getAttribute('aria-pressed')).toBe('true');
    await pause(10);
  });
});
