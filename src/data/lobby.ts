import { ITEMS, type Item } from './catalog';

/**
 * The Lobby (SPEC.md §5, new in 1.1): its names, numbers and texts. The screen only draws them. The same words are in
 * every Mossgrove app, because the scenarios quote them.
 */
export const LOBBY = {
  banners: 5,
  rows: 4,
  tiles: 20,
  topTiles: 10,
  gridCells: 12,
  innerLines: 30,
  board: 26,
  /** Auto-advance moves the pager every 4 s while it is on. */
  autoAdvanceMs: 4000,
} as const;

/** "Saved appears after": the choices, in seconds. 0 is the default; SPEC.md §5 says why each one. */
export const DELAYS = [0, 3, 6, 12, 20] as const;
export type Delay = (typeof DELAYS)[number];

export const BANNERS = [
  'New in the Kitchen aisle',
  'Warm, low desk lamps',
  'Ferns that like the shade',
  'Candles for long evenings',
  'Totes for market day',
] as const;

export const CHIPS = ['All', 'Kitchen', 'Desk', 'Garden', 'Home', 'Under $20', 'Under $40', 'New', 'Gifts', 'Sets', 'Lamps', 'Candles'] as const;

export const BAR_ITEMS = ['Home', 'Live', 'Saved', 'Offers'] as const;
export type BarItem = (typeof BAR_ITEMS)[number];

export const SHEET_BUTTONS = ['Open', 'Preview', 'Saved', 'Rate'] as const;
export type SheetButton = (typeof SHEET_BUTTONS)[number];

export const LOBBY_TEXT = {
  nothingTouched: 'Nothing touched',
  savedEmpty: 'Saved: nothing yet',
  footer: 'End of the lobby',
  footerNote: 'A test bench: nothing here is for sale.',
  banner: 'A test banner',
  promoNote: 'A test banner. Nothing here is for sale.',
  backToLobby: 'Back to the lobby',
} as const;

/** The Top 10 row's number where a row is asked for: it is not one of the page's rows 1–4. */
export const TOP_ROW = 0;

/** Tile m of row n (both from 1) shows item ((n − 1) × 10 + m − 1) mod 40 + 1. */
export function tileItem(row: number, tile: number): Item {
  return ITEMS[((row - 1) * 10 + tile - 1) % ITEMS.length];
}

/** Tile m (from 1) of the Top 10 row shows item m + 30: No. 031 to No. 040. */
export function topItem(tile: number): Item {
  return ITEMS[tile + 29];
}

/** The item a tile shows, for a row from 1 to 4 or TOP_ROW. */
export function itemAt(row: number, tile: number): Item {
  return row === TOP_ROW ? topItem(tile) : tileItem(row, tile);
}

/** Grid cell n (from 1) shows item n + 28. */
export function gridItem(cell: number): Item {
  return ITEMS[cell + 27];
}

/** "A1" … "Z26": the column letter, then the row number, both from 1. */
export function boardLabel(col: number, row: number): string {
  return `${String.fromCharCode(64 + col)}${row}`;
}

export function pagerPosition(banner: number): string {
  return `Banner ${banner} of ${LOBBY.banners}`;
}

/** The first and last fully visible tiles of a row; the first alone when only one is. */
export function rowPosition(row: number, first: number, last: number): string {
  return last <= first ? `Row ${row}: tile ${first} of ${LOBBY.tiles}` : `Row ${row}: tiles ${first}–${last} of ${LOBBY.tiles}`;
}

export function topRowPosition(first: number, last: number): string {
  return last <= first ? `Top 10: tile ${first} of ${LOBBY.topTiles}` : `Top 10: tiles ${first}–${last} of ${LOBBY.topTiles}`;
}

/** The detail's place line: "Row 3, tile 15", or "Top 10, tile 2". */
export function detailPlace(row: number, tile: number): string {
  return row === TOP_ROW ? `Top 10, tile ${tile}` : `Row ${row}, tile ${tile}`;
}

/** Where the log says a tile was touched: "row 3, tile 15" or "top row, tile 2". */
export function tileWhere(row: number, tile: number): string {
  return row === TOP_ROW ? `top row, tile ${tile}` : `row ${row}, tile ${tile}`;
}

export function boardPosition(col: number, row: number): string {
  return `Board: top-left ${boardLabel(col, row)}`;
}

export function innerLine(n: number): string {
  return `Line ${n} of ${LOBBY.innerLines}`;
}

/** How a touch came: the words each log line starts with. */
export type Touch = 'Tapped' | 'Long-pressed' | 'Double-tapped';

/** The touch log's state: the last three lines, newest first, and the count since the last reset. */
export interface TouchLogState {
  lines: string[];
  count: number;
}

export const EMPTY_LOG: TouchLogState = { lines: [], count: 0 };

export function logTouch(log: TouchLogState, touch: Touch, what: string, where: string): TouchLogState {
  return { lines: [`${touch}: ${what} (${where})`, ...log.lines].slice(0, 3), count: log.count + 1 };
}

export function logText(log: TouchLogState): string {
  return log.lines.length === 0 ? LOBBY_TEXT.nothingTouched : log.lines.join('\n');
}

export function countText(log: TouchLogState): string {
  return `Touches: ${log.count}`;
}

/**
 * Geometry of a horizontal row of tiles, in CSS px (dp in a web view): 16 px of padding at each end, tiles 100 wide,
 * 8 apart. The first and last tiles that are wholly inside the row's visible width, from 1; the first one partly shown
 * when none is whole.
 */
export function fullyVisibleTiles(scrollLeft: number, width: number, count: number): [number, number] {
  const pad = 16;
  const tile = 100;
  const gap = 8;
  let first = 0;
  let last = 0;
  let partly = 0;
  for (let i = 0; i < count; i++) {
    const start = pad + i * (tile + gap) - scrollLeft;
    const end = start + tile;
    if (end > 0 && start < width && partly === 0) partly = i + 1;
    if (start >= -0.5 && end <= width + 0.5) {
      if (first === 0) first = i + 1;
      last = i + 1;
    }
  }
  if (first === 0) return [Math.max(partly, 1), Math.max(partly, 1)];
  return [first, last];
}

/** The board's cells are 56 px; the top-left cell counted is the first one wholly shown. */
export const BOARD_CELL = 56;

export function boardTopLeft(scrollLeft: number, scrollTop: number): [number, number] {
  const col = Math.ceil(scrollLeft / BOARD_CELL - 0.001) + 1;
  const row = Math.ceil(scrollTop / BOARD_CELL - 0.001) + 1;
  const clamp = (n: number) => Math.min(LOBBY.board, Math.max(1, n));
  return [clamp(col), clamp(row)];
}
