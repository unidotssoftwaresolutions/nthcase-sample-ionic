import {
  IonButton,
  IonChip,
  IonContent,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonTabButton,
  IonToggle,
} from '@ionic/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  BANNERS,
  BAR_ITEMS,
  BOARD_CELL,
  boardLabel,
  boardPosition,
  boardTopLeft,
  CHIPS,
  countText,
  DELAYS,
  detailPlace,
  EMPTY_LOG,
  fullyVisibleTiles,
  gridItem,
  innerLine,
  itemAt,
  LOBBY,
  LOBBY_TEXT,
  logText,
  logTouch,
  pagerPosition,
  rowPosition,
  SHEET_BUTTONS,
  tileItem,
  tileWhere,
  TOP_ROW,
  topItem,
  topRowPosition,
  type BarItem,
  type SheetButton,
  type Touch,
  type TouchLogState,
} from '../data/lobby';
import { setLobbyPagerShown, setLobbySavedDelay, upOrShop, useAppState } from '../data/store';
import { T, tid } from '../testIds';
import { useOverlay } from '../ui/overlays';
import { GlyphTile, Icon, ItemNumber, Screen, TopBar } from '../ui/parts';
import { useTabButtonIds } from '../ui/tabBar';

/**
 * How long a finger must stay down for a long press, and how long the Lobby waits for a second tap before it calls a
 * tap a tap. The web has no long press of its own and no double-tap time a page can read, so these are the Lobby's
 * rule, the same numbers as Android's defaults (README, "A tile's touch").
 */
export const LONG_PRESS_MS = 500;
export const DOUBLE_TAP_MS = 300;

/** What takes the place of the pager, the Top 10 row and the page (SPEC.md §5, Lobby › Panels). */
type Panel =
  | { kind: 'none' }
  /** row 1–4, or TOP_ROW for the Top 10 row */
  | { kind: 'detail'; row: number; tile: number }
  | { kind: 'promo'; banner: number }
  | { kind: 'saved' };

/** What a quick sheet was opened for: its title, and what its Open opens. */
interface SheetFor {
  title: string;
  opens: Panel;
}

interface LobbyActions {
  touch: (how: Touch, what: string, where: string) => void;
  show: (panel: Panel) => void;
  sheet: (target: SheetFor) => void;
  /** Every scroller's place in this visit, by its id, so a scroller drawn again (a panel closed, the pager back) finds it. */
  places: Map<string, { left: number; top: number }>;
}

const LobbyContext = createContext<LobbyActions | null>(null);

function useLobby(): LobbyActions {
  return useContext(LobbyContext)!;
}

/**
 * The Lobby (SPEC.md §5, new in 1.1): a test bench for scrolling. The scrollers are CSS scrollers. The promo pager
 * (a scroll-snap strip) and the Top 10 row sit above the page, outside it, so they are the first scrollables in the
 * tree; the page is ion-content's own scroller. "Show the pager" takes the pager and its position line out of the
 * DOM. The bar's Saved is not in the DOM until its delay has passed. The touch log at the top names every tap, long
 * press and double tap, and nothing that scrolls writes to it.
 */
export function LobbyScreen() {
  const app = useAppState();
  const [log, setLog] = useState<TouchLogState>(EMPTY_LOG);
  const [panel, setPanel] = useState<Panel>({ kind: 'none' });
  // what the sheet was last opened for stays while it slides away; `sheetOpen` says whether it is up
  const [sheet, setSheet] = useState<SheetFor | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [barSelected, setBarSelected] = useState<BarItem>('Home');
  const [places] = useState(() => new Map<string, { left: number; top: number }>());

  // Saved appears late: out of the DOM until the delay has passed. The count starts when the Lobby opens, and again
  // when a delay is chosen.
  const delay = app.lobbySavedDelay;
  const [epoch, setEpoch] = useState(0);
  const [savedShown, setSavedShown] = useState(delay === 0);
  useEffect(() => {
    if (savedShown) return;
    const timer = setTimeout(() => setSavedShown(true), delay * 1000);
    return () => clearTimeout(timer);
    // the epoch is the restart; the delay is read as it is at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epoch]);
  const choose = (seconds: number) => {
    setLobbySavedDelay(seconds);
    setSavedShown(seconds === 0);
    setEpoch((e) => e + 1);
  };

  const touch = useCallback((how: Touch, what: string, where: string) => setLog((current) => logTouch(current, how, what, where)), []);
  const openSheet = useCallback((target: SheetFor) => {
    setSheet(target);
    setSheetOpen(true);
  }, []);
  const actions: LobbyActions = { touch, show: setPanel, sheet: openSheet, places };

  const closePanel = () => setPanel({ kind: 'none' });
  const panelOpen = panel.kind === 'detail' || panel.kind === 'promo';
  // Back (Android's, or the browser's in the Pages build) closes the sheet first, then the detail or the promo.
  useOverlay(panelOpen, closePanel);
  useOverlay(sheetOpen, () => setSheetOpen(false));

  return (
    <LobbyContext.Provider value={actions}>
      <Screen id={T.lobbyScreen}>
        <TopBar title="Lobby" onBack={() => (panelOpen ? closePanel() : upOrShop())} />
        <TouchLogBlock log={log} onReset={() => setLog(EMPTY_LOG)} />
        <DelayChoice selected={delay} onChoose={choose} pagerShown={app.lobbyPagerShown} />
        {panel.kind === 'none' && (
          <>
            {/* off, the pager and its position line leave the DOM: not hidden, not zero-sized */}
            {app.lobbyPagerShown && <Pager />}
            <TopRow />
            <Page />
          </>
        )}
        {panel.kind === 'detail' && <DetailPanel row={panel.row} tile={panel.tile} onBack={closePanel} />}
        {panel.kind === 'promo' && <PromoPanel banner={panel.banner} onBack={closePanel} />}
        {panel.kind === 'saved' && <SavedPanel />}
        <LobbyBar
          savedShown={savedShown}
          selected={barSelected}
          onItem={(item) => {
            touch('Tapped', item, 'bar');
            setBarSelected(item);
            setPanel(item === 'Saved' ? { kind: 'saved' } : { kind: 'none' });
          }}
        />
      </Screen>
      <QuickSheet
        target={sheet}
        open={sheetOpen}
        onButton={(label) => {
          const target = sheet!;
          touch('Tapped', label, `quick sheet, ${target.title}`);
          setSheetOpen(false);
          if (label === 'Open') setPanel(target.opens);
        }}
        onDismiss={() => setSheetOpen(false)}
      />
    </LobbyContext.Provider>
  );
}

/* Touches. */

interface TouchableProps {
  what: string;
  where: string;
  onTap?: () => void;
  onLongPress?: () => void;
}

/**
 * A touchable element's tap, long press and double tap.
 * - **Tap** is the browser's own `click`: the browser decides whether a touch was a tap. When it takes a drag for a
 *   scroll it sends `pointercancel` and no click.
 * - **Long press** starts on `pointerdown` and fires after LONG_PRESS_MS, unless `pointerup` or `pointercancel` came
 *   first. Movement alone never cancels it: only the browser's own decision to scroll (`pointercancel`) does, as
 *   only a parent's intercept (ACTION_CANCEL) does for an Android View whose finger stays inside it.
 * - **Double tap** is a second click within DOUBLE_TAP_MS. A tap is logged once that time has passed with no second
 *   click, so a double tap is one line.
 */
function useTouchable({ what, where, onTap, onLongPress }: TouchableProps) {
  const { touch } = useLobby();
  const timers = useRef({ press: 0, tap: 0, longFired: false });
  const latest = useRef({ what, where, onTap, onLongPress });
  useEffect(() => {
    latest.current = { what, where, onTap, onLongPress };
  });
  useEffect(() => {
    const t = timers.current;
    return () => {
      window.clearTimeout(t.press);
      window.clearTimeout(t.tap);
    };
  }, []);
  const stopPress = () => {
    window.clearTimeout(timers.current.press);
    timers.current.press = 0;
  };
  return {
    onPointerDown: (event: ReactPointerEvent) => {
      if (event.button !== 0) return;
      const t = timers.current;
      t.longFired = false;
      stopPress();
      t.press = window.setTimeout(() => {
        t.press = 0;
        t.longFired = true;
        window.clearTimeout(t.tap);
        t.tap = 0;
        const { what: w, where: at, onLongPress: long } = latest.current;
        touch('Long-pressed', w, at);
        long?.();
      }, LONG_PRESS_MS);
    },
    onPointerUp: stopPress,
    onPointerCancel: stopPress,
    onClick: () => {
      const t = timers.current;
      if (t.longFired) {
        // the click a mouse sends when it lets go after a long press is part of that press
        t.longFired = false;
        return;
      }
      if (t.tap) {
        window.clearTimeout(t.tap);
        t.tap = 0;
        touch('Double-tapped', latest.current.what, latest.current.where);
        return;
      }
      t.tap = window.setTimeout(() => {
        t.tap = 0;
        const { what: w, where: at, onTap: tap } = latest.current;
        touch('Tapped', w, at);
        tap?.();
      }, DOUBLE_TAP_MS);
    },
    // the web view's own long-press menu, and a mouse's right click, stay out of it
    onContextMenu: (event: ReactMouseEvent) => event.preventDefault(),
  };
}

/** A plain button that is one touchable element. */
function Touchable({ id, className, label, children, ...touchable }: TouchableProps & { id: string; className: string; label?: string; children: ReactNode }) {
  const handlers = useTouchable(touchable);
  return (
    <button type="button" className={`mg-touchable ${className}`} {...tid(id)} aria-label={label} {...handlers}>
      {children}
    </button>
  );
}

/* Remembering where each scroller was. */

/**
 * A scroller's place, kept for this visit by its id: written on every scroll, put back when the scroller is drawn
 * again. `onPlace` hears every place, the first included.
 */
function usePlace(id: string, ref: RefObject<HTMLElement | null>, onPlace: (left: number, top: number, el: HTMLElement) => void) {
  const { places } = useLobby();
  const report = useRef(onPlace);
  useEffect(() => {
    report.current = onPlace;
  });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Put the kept place back. Inside the page, ion-content takes its children into its own shadow root once it has
    // drawn, which lays them out again at 0: there the place goes back once ion-content has drawn, a frame later.
    const kept = places.get(id);
    let frame = 0;
    let live = true;
    const restore = () => {
      if (!live || !kept) return;
      el.scrollLeft = kept.left;
      el.scrollTop = kept.top;
    };
    restore();
    const content = el.closest('ion-content');
    if (kept && content) {
      // getScrollElement answers once ion-content has drawn its scroller (and taken its children into it)
      void content.getScrollElement().then(() => {
        frame = requestAnimationFrame(restore);
      });
    }
    const onScroll = () => {
      places.set(id, { left: el.scrollLeft, top: el.scrollTop });
      report.current(el.scrollLeft, el.scrollTop, el);
    };
    report.current(el.scrollLeft, el.scrollTop, el);
    el.addEventListener('scroll', onScroll, { passive: true });
    const resized = typeof ResizeObserver === 'function' ? new ResizeObserver(() => report.current(el.scrollLeft, el.scrollTop, el)) : null;
    resized?.observe(el);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
      resized?.disconnect();
    };
  }, [id, ref, places]);
}

/* The fixed parts at the top. */

function TouchLogBlock({ log, onReset }: { log: TouchLogState; onReset: () => void }) {
  return (
    <div className="mg-lobby-log">
      <div className="mg-grow">
        <p className="mg-lobby-small-label mg-muted">Touch log</p>
        <p className="mg-lobby-log-lines" {...tid(T.lobbyTouchLog)} role="log" aria-live="polite">
          {logText(log)}
        </p>
      </div>
      <div className="mg-lobby-log-side">
        <span className="mg-label" {...tid(T.lobbyTouchCount)}>
          {countText(log)}
        </span>
        <IonButton {...tid(T.lobbyTouchReset)} fill="clear" size="small" onClick={onReset}>
          Reset
        </IonButton>
      </div>
    </div>
  );
}

function DelayChoice({ selected, onChoose, pagerShown }: { selected: number; onChoose: (seconds: number) => void; pagerShown: boolean }) {
  return (
    <div className="mg-lobby-delay">
      <div className="mg-row mg-lobby-delay-line">
        <span className="mg-lobby-small-label mg-muted mg-grow">Saved appears after</span>
        <IonToggle
          {...tid(T.lobbyPagerShown)}
          checked={pagerShown}
          labelPlacement="start"
          className="mg-lobby-toggle"
          onIonChange={(event) => setLobbyPagerShown(event.detail.checked)}
        >
          Show the pager
        </IonToggle>
      </div>
      <IonSegment
        {...tid(T.lobbySavedDelay)}
        value={String(selected)}
        className="mg-lobby-segment"
        onIonChange={(event) => {
          const seconds = Number(event.detail.value);
          if (seconds !== selected) onChoose(seconds);
        }}
      >
        {DELAYS.map((seconds) => (
          // a tap on the chosen one chooses it again: the count starts again, as on Android
          <IonSegmentButton key={seconds} value={String(seconds)} {...tid(T.lobbySavedDelayChoice(seconds))} onClick={() => onChoose(seconds)}>
            {seconds} s
          </IonSegmentButton>
        ))}
      </IonSegment>
    </div>
  );
}

function Pager() {
  const strip = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [auto, setAuto] = useState(false);
  const { show, sheet } = useLobby();
  usePlace(T.lobbyPager, strip, (left, _top, el) => {
    if (el.clientWidth > 0) setPage(Math.min(LOBBY.banners, Math.max(1, Math.round(left / el.clientWidth) + 1)));
  });
  useEffect(() => {
    if (!auto) return;
    const timer = window.setInterval(() => {
      const el = strip.current;
      if (!el || el.clientWidth === 0) return;
      const next = Math.round(el.scrollLeft / el.clientWidth + 1) % LOBBY.banners;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, LOBBY.autoAdvanceMs);
    return () => window.clearInterval(timer);
  }, [auto]);
  const position = pagerPosition(page);
  return (
    <>
      <div className="mg-lobby-pager" ref={strip} {...tid(T.lobbyPager)}>
        {BANNERS.map((title, i) => (
          <div className="mg-lobby-pager-page" key={title}>
            <Touchable
              id={T.lobbyBanner(i + 1)}
              className="mg-lobby-banner"
              what={title}
              where={`banner ${i + 1}`}
              onTap={() => show({ kind: 'promo', banner: i + 1 })}
              onLongPress={() => sheet({ title, opens: { kind: 'promo', banner: i + 1 } })}
            >
              <span className="mg-title">{title}</span>
              <span className="mg-body-small">{LOBBY_TEXT.banner}</span>
            </Touchable>
          </div>
        ))}
      </div>
      <div className="mg-row mg-lobby-pager-line">
        <span className="mg-row mg-grow mg-lobby-dots-line" {...tid(T.lobbyPagerPosition)} aria-label={position} role="status">
          <span className="mg-lobby-dots" aria-hidden>
            {BANNERS.map((title, i) => (
              <span key={title} className={i + 1 === page ? 'mg-lobby-dot mg-lobby-dot-on' : 'mg-lobby-dot'} />
            ))}
          </span>
          <span className="mg-label" aria-hidden>
            {position}
          </span>
        </span>
        <IonToggle {...tid(T.lobbyPagerAuto)} checked={auto} labelPlacement="start" className="mg-lobby-toggle" onIonChange={(event) => setAuto(event.detail.checked)}>
          Auto-advance
        </IonToggle>
      </div>
    </>
  );
}

/**
 * The Top 10 row (SPEC.md §5, 1.1): fixed, outside the page, under the pager or in its place. Nothing vertical
 * encloses it: the case of the app where the fault was first seen.
 */
function TopRow() {
  const row = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(topRowPosition(1, 3));
  const { show, sheet } = useLobby();
  usePlace(T.lobbyTopRow, row, (left, _top, el) => {
    if (el.clientWidth > 0) setPosition(topRowPosition(...fullyVisibleTiles(left, el.clientWidth, LOBBY.topTiles)));
  });
  return (
    <>
      <h2 className="mg-title-small mg-lobby-heading mg-lobby-top-heading" {...tid(T.lobbyTopRowPosition)} aria-label={position}>
        {position}
      </h2>
      <div className="mg-lobby-strip mg-lobby-top-row" ref={row} {...tid(T.lobbyTopRow)}>
        {Array.from({ length: LOBBY.topTiles }, (_, i) => {
          const tile = i + 1;
          const item = topItem(tile);
          return (
            <Touchable
              key={tile}
              id={T.lobbyTopRowTile(tile)}
              className="mg-lobby-tile mg-lobby-top-tile"
              what={item.name}
              where={tileWhere(TOP_ROW, tile)}
              onTap={() => show({ kind: 'detail', row: TOP_ROW, tile })}
              onLongPress={() => sheet({ title: item.name, opens: { kind: 'detail', row: TOP_ROW, tile } })}
            >
              {/* a band 100 × 64, lower than a page row's tile, so the page keeps its room under the fixed row */}
              <GlyphTile item={item} size={64} width={100} />
              <span className="mg-body-small mg-lobby-tile-name">{item.name}</span>
            </Touchable>
          );
        })}
      </div>
    </>
  );
}

/* The page. */

function Page() {
  const content = useRef<HTMLIonContentElement>(null);
  const { places } = useLobby();
  // ion-content scrolls an element in its own shadow root; its place is kept the same way as the others'
  useEffect(() => {
    const host = content.current;
    if (!host) return;
    let live = true;
    let stop = () => {};
    void host.getScrollElement().then((el) => {
      if (!live) return;
      const kept = places.get(T.lobbyPage);
      if (kept) el.scrollTop = kept.top;
      const onScroll = () => places.set(T.lobbyPage, { left: 0, top: el.scrollTop });
      el.addEventListener('scroll', onScroll, { passive: true });
      stop = () => el.removeEventListener('scroll', onScroll);
    });
    return () => {
      live = false;
      stop();
    };
  }, [places]);
  return (
    <IonContent ref={content} {...tid(T.lobbyPage)} className="mg-lobby-page">
      <Chips />
      {Array.from({ length: LOBBY.rows }, (_, i) => (
        <TileRow key={i + 1} row={i + 1} />
      ))}
      <Grid />
      <InnerList />
      <Board />
      <div className="mg-lobby-footer" {...tid(T.lobbyFooter)}>
        <p className="mg-title">{LOBBY_TEXT.footer}</p>
        <p className="mg-body-small mg-muted">{LOBBY_TEXT.footerNote}</p>
      </div>
    </IonContent>
  );
}

function Chip({ n, label, selected, onSelect }: { n: number; label: string; selected: boolean; onSelect: () => void }) {
  const handlers = useTouchable({ what: label, where: `chip ${n}`, onTap: onSelect });
  return (
    <IonChip
      {...tid(T.lobbyChip(n))}
      className={selected ? 'mg-touchable mg-lobby-chip mg-lobby-chip-on' : 'mg-touchable mg-lobby-chip'}
      role="button"
      aria-pressed={selected ? 'true' : 'false'}
      {...handlers}
    >
      {selected && <Icon name="check" size={16} />}
      <span>{label}</span>
    </IonChip>
  );
}

function Chips() {
  const strip = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(1);
  usePlace(T.lobbyChips, strip, () => {});
  return (
    <div className="mg-lobby-strip mg-lobby-chips" ref={strip} {...tid(T.lobbyChips)}>
      {CHIPS.map((label, i) => (
        <Chip key={label} n={i + 1} label={label} selected={selected === i + 1} onSelect={() => setSelected(i + 1)} />
      ))}
    </div>
  );
}

function TileRow({ row }: { row: number }) {
  const strip = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(rowPosition(row, 1, 3));
  const { show, sheet } = useLobby();
  usePlace(T.lobbyRow(row), strip, (left, _top, el) => {
    if (el.clientWidth > 0) setPosition(rowPosition(row, ...fullyVisibleTiles(left, el.clientWidth, LOBBY.tiles)));
  });
  return (
    <>
      <h2 className="mg-title-small mg-lobby-heading" {...tid(T.lobbyRowPosition(row))} aria-label={position}>
        {position}
      </h2>
      <div className="mg-lobby-strip mg-lobby-row" ref={strip} {...tid(T.lobbyRow(row))}>
        {Array.from({ length: LOBBY.tiles }, (_, i) => {
          const tile = i + 1;
          const item = tileItem(row, tile);
          return (
            <Touchable
              key={tile}
              id={T.lobbyRowTile(row, tile)}
              className="mg-lobby-tile"
              what={item.name}
              where={tileWhere(row, tile)}
              onTap={() => show({ kind: 'detail', row, tile })}
              onLongPress={() => sheet({ title: item.name, opens: { kind: 'detail', row, tile } })}
            >
              <GlyphTile item={item} size={100} />
              <span className="mg-body-small mg-lobby-tile-name">{item.name}</span>
              <ItemNumber item={item} />
            </Touchable>
          );
        })}
      </div>
    </>
  );
}

function Grid() {
  return (
    <>
      <h2 className="mg-title-small mg-lobby-heading">Grid</h2>
      <div className="mg-lobby-grid" {...tid(T.lobbyGrid)}>
        {Array.from({ length: LOBBY.gridCells }, (_, i) => {
          const item = gridItem(i + 1);
          return (
            <Touchable key={i} id={T.lobbyGridCell(i + 1)} className="mg-lobby-cell" what={item.name} where={`grid, cell ${i + 1}`}>
              <GlyphTile item={item} size={40} />
              <span className="mg-body-small">{item.name}</span>
            </Touchable>
          );
        })}
      </div>
    </>
  );
}

function InnerList() {
  const list = useRef<HTMLDivElement>(null);
  usePlace(T.lobbyInnerList, list, () => {});
  return (
    <>
      <h2 className="mg-title-small mg-lobby-heading">Inner list</h2>
      <div className="mg-lobby-inner" ref={list} {...tid(T.lobbyInnerList)}>
        {Array.from({ length: LOBBY.innerLines }, (_, i) => (
          <Touchable key={i} id={T.lobbyInnerRow(i + 1)} className="mg-lobby-line" what={`Line ${i + 1}`} where="inner list">
            {innerLine(i + 1)}
          </Touchable>
        ))}
      </div>
    </>
  );
}

function Board() {
  const board = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(boardPosition(1, 1));
  usePlace(T.lobbyBoard, board, (left, top) => setPosition(boardPosition(...boardTopLeft(left, top))));
  const cells: ReactNode[] = [];
  for (let row = 1; row <= LOBBY.board; row++) {
    for (let col = 1; col <= LOBBY.board; col++) {
      const label = boardLabel(col, row);
      cells.push(
        <Touchable key={label} id={T.lobbyBoardCell(col, row)} className="mg-lobby-board-cell" what={label} where="board">
          {label}
        </Touchable>,
      );
    }
  }
  return (
    <>
      <h2 className="mg-title-small mg-lobby-heading" {...tid(T.lobbyBoardPosition)} aria-label={position}>
        {position}
      </h2>
      <div className="mg-lobby-board-frame">
        {/* one element that scrolls both ways */}
        <div className="mg-lobby-board" ref={board} {...tid(T.lobbyBoard)} style={{ ['--mg-board-cell' as string]: `${BOARD_CELL}px` }}>
          <div className="mg-lobby-board-cells">{cells}</div>
        </div>
      </div>
    </>
  );
}

/* Panels, the bar and the sheet. */

function DetailPanel({ row, tile, onBack }: { row: number; tile: number; onBack: () => void }) {
  const item = itemAt(row, tile);
  return (
    <div className="mg-lobby-panel" {...tid(T.lobbyDetail)}>
      <GlyphTile item={item} size={96} label={`Drawing of the ${item.name}`} />
      <p className="mg-headline-small">{item.name}</p>
      <ItemNumber item={item} />
      <p className="mg-body">{detailPlace(row, tile)}</p>
      <IonButton {...tid(T.lobbyDetailBack)} fill="outline" onClick={onBack}>
        {LOBBY_TEXT.backToLobby}
      </IonButton>
    </div>
  );
}

function PromoPanel({ banner, onBack }: { banner: number; onBack: () => void }) {
  return (
    <div className="mg-lobby-panel" {...tid(T.lobbyPromo)}>
      <p className="mg-headline-small">{BANNERS[banner - 1]}</p>
      <p className="mg-label">{pagerPosition(banner)}</p>
      <p className="mg-body">{LOBBY_TEXT.promoNote}</p>
      <IonButton {...tid(T.lobbyPromoBack)} fill="outline" onClick={onBack}>
        {LOBBY_TEXT.backToLobby}
      </IonButton>
    </div>
  );
}

function SavedPanel() {
  return (
    <div className="mg-lobby-panel" {...tid(T.lobbySavedScreen)}>
      <span className="mg-muted">
        <Icon name="check" size={40} />
      </span>
      <p className="mg-title-large">{LOBBY_TEXT.savedEmpty}</p>
    </div>
  );
}

const BAR_IDS: Record<BarItem, string> = { Home: T.lobbyBarHome, Live: T.lobbyBarLive, Saved: T.lobbyBarSaved, Offers: T.lobbyBarOffers };
const BAR_ICONS = { Home: 'shop', Live: 'eye', Saved: 'check', Offers: 'cart' } as const;

/** The Lobby's own bar, not the app's tab bar. Saved is left out of the DOM until its delay has passed. */
function LobbyBar({ savedShown, selected, onItem }: { savedShown: boolean; selected: BarItem; onItem: (item: BarItem) => void }) {
  const bar = useRef<HTMLIonTabBarElement>(null);
  useTabButtonIds(bar);
  return (
    <ion-tab-bar ref={bar} selectedTab={selected} className="mg-tab-bar mg-lobby-bar" {...tid(T.lobbyBar)}>
      {BAR_ITEMS.filter((item) => item !== 'Saved' || savedShown).map((item) => (
        <IonTabButton key={item} tab={item} {...tid(BAR_IDS[item])} aria-label={item} onClick={() => onItem(item)}>
          <Icon name={BAR_ICONS[item]} />
          <span className="mg-tab-label">{item}</span>
        </IonTabButton>
      ))}
    </ion-tab-bar>
  );
}

/**
 * The quick sheet: Ionic's sheet modal, a layer of its own over the Lobby. Back, a tap outside it or a drag down
 * closes it, with no log line.
 */
function QuickSheet({
  target,
  open,
  onButton,
  onDismiss,
}: {
  target: SheetFor | null;
  open: boolean;
  onButton: (label: SheetButton) => void;
  onDismiss: () => void;
}) {
  const ids: Record<SheetButton, string> = { Open: T.lobbySheetOpen, Preview: T.lobbySheetPreview, Saved: T.lobbySheetSaved, Rate: T.lobbySheetRate };
  return (
    <IonModal isOpen={open} breakpoints={[0, 1]} initialBreakpoint={1} className="mg-lobby-sheet" onDidDismiss={onDismiss}>
      <div className="mg-lobby-sheet-body" {...tid(T.lobbySheet)}>
        <h2 className="mg-title-large" {...tid(T.lobbySheetTitle)}>
          {target?.title}
        </h2>
        {SHEET_BUTTONS.map((label) => (
          <IonButton key={label} {...tid(ids[label])} fill="clear" expand="block" className="mg-lobby-sheet-button" onClick={() => onButton(label)}>
            {label}
          </IonButton>
        ))}
      </div>
    </IonModal>
  );
}
