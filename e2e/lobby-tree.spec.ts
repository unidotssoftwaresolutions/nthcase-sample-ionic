import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evidenceDir, guard, openLobby } from './support';

/**
 * The Lobby's tree order (SPEC.md §12): with the pager on, the pager is the first scrollable; with it off, the pager is
 * gone and the Top 10 row is the first; Saved is absent before its delay.
 *
 * Proven twice, in the real browser engines:
 * - **WEBVIEW context** (what Appium reads as the page): the DOM, walked in the flat tree a browser renders (shadow
 *   roots entered, slots followed), in Chromium and WebKit.
 * - **NATIVE context, as far as a browser can show it** (Chromium only): Chromium's own accessibility tree, read over
 *   the DevTools protocol, in its order. Android's web view hands UiAutomator2 the same tree's unignored nodes, and a
 *   node is "scrollable" there when Blink calls its element a scroll container with somewhere to scroll; the protocol
 *   does not report that flag, so each node's element is asked the same question. What only a phone shows is in the
 *   README and the report.
 *
 * Each run writes what it saw to build/lobby/.
 */

interface Scroller {
  /** the element's own id, or "‹nearest id› › tag.class" when it has none */
  name: string;
  axes: string;
  rect: string;
}

/** Every element that scrolls, in the order the browser renders them, and whether the document itself scrolls. */
async function domScrollers(page: Page): Promise<{ scrollers: Scroller[]; documentScrolls: boolean }> {
  return page.evaluate(() => {
    const out: { name: string; axes: string; rect: string }[] = [];
    const nearestId = (el: Element): string => {
      let at: Element | null = el;
      while (at) {
        if (at.id) return at.id;
        at = at.parentElement ?? ((at.getRootNode() as ShadowRoot).host ?? null);
      }
      return '(none)';
    };
    const visit = (node: Node) => {
      if (node instanceof Element) {
        const style = getComputedStyle(node);
        const x = /(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth;
        const y = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
        if (x || y) {
          const r = node.getBoundingClientRect();
          const name = node.id || `${nearestId(node)} › ${node.tagName.toLowerCase()}.${[...node.classList].join('.')}`;
          out.push({ name, axes: `${x ? 'x' : ''}${y ? 'y' : ''}`, rect: `[${Math.round(r.left)},${Math.round(r.top)}][${Math.round(r.right)},${Math.round(r.bottom)}]` });
        }
        if (node.shadowRoot) {
          node.shadowRoot.childNodes.forEach(visit);
          return;
        }
      }
      if (node instanceof HTMLSlotElement) {
        const assigned = node.assignedNodes({ flatten: true });
        (assigned.length ? assigned : [...node.childNodes]).forEach(visit);
        return;
      }
      node.childNodes.forEach(visit);
    };
    visit(document.body);
    const root = document.scrollingElement!;
    const style = getComputedStyle(root);
    const documentScrolls =
      (style.overflowY !== 'hidden' && root.scrollHeight > root.clientHeight) || (style.overflowX !== 'hidden' && root.scrollWidth > root.clientWidth);
    return { scrollers: out, documentScrolls };
  });
}

interface AxNode {
  nodeId: string;
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
  childIds?: string[];
  backendDOMNodeId?: number;
}

/**
 * Chromium's accessibility tree, unignored nodes in tree order, each with its element's HTML id (what Chrome's web
 * view may hand UiAutomator2 as resource-id), the nearest id above it, and whether its element scrolls.
 */
async function axTree(page: Page): Promise<{ role: string; name: string; id: string; under: string; axes: string }[]> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  try {
    await cdp.send('Accessibility.enable');
    await cdp.send('DOM.enable');
    const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: AxNode[] };
    // the scrolling elements, named by their backend node ids
    await page.evaluate(() => {
      const found: Element[] = [];
      const visit = (node: Node) => {
        if (node instanceof Element) {
          const style = getComputedStyle(node);
          const x = /(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth;
          const y = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
          if (x || y) {
            node.setAttribute('data-scroll-axes', `${x ? 'x' : ''}${y ? 'y' : ''}`);
            found.push(node);
          }
          if (node.shadowRoot) node.shadowRoot.childNodes.forEach(visit);
        }
        node.childNodes.forEach(visit);
      };
      visit(document.body);
      (window as unknown as { mgScrollers: Element[] }).mgScrollers = found;
    });
    const scrolling = new Map<number, string>();
    const { result } = (await cdp.send('Runtime.evaluate', { expression: 'window.mgScrollers' })) as { result: { objectId: string } };
    const { result: props } = (await cdp.send('Runtime.getProperties', { objectId: result.objectId, ownProperties: true })) as {
      result: { name: string; value?: { objectId?: string } }[];
    };
    for (const prop of props) {
      if (!/^\d+$/.test(prop.name) || !prop.value?.objectId) continue;
      const { node } = (await cdp.send('DOM.describeNode', { objectId: prop.value.objectId })) as {
        node: { backendNodeId: number; attributes?: string[] };
      };
      const attrs = node.attributes ?? [];
      scrolling.set(node.backendNodeId, attrs[attrs.indexOf('data-scroll-axes') + 1] ?? '?');
    }
    await page.evaluate(() => document.querySelectorAll('[data-scroll-axes]').forEach((el) => el.removeAttribute('data-scroll-axes')));
    // every element's HTML id, by backend node id, through shadow roots and frames
    const { root } = (await cdp.send('DOM.getDocument', { depth: -1, pierce: true })) as { root: DomNode };
    const htmlId = new Map<number, string>();
    const walk = (d: DomNode) => {
      const a = d.attributes ?? [];
      for (let i = 0; i < a.length; i += 2) if (a[i] === 'id') htmlId.set(d.backendNodeId, a[i + 1]);
      [...(d.children ?? []), ...(d.shadowRoots ?? [])].forEach(walk);
      if (d.contentDocument) walk(d.contentDocument);
    };
    walk(root);

    const byId = new Map(nodes.map((n) => [n.nodeId, n]));
    const out: { role: string; name: string; id: string; under: string; axes: string }[] = [];
    const visit = (n: AxNode, under: string) => {
      const id = n.backendDOMNodeId ? (htmlId.get(n.backendDOMNodeId) ?? '') : '';
      if (!n.ignored) {
        out.push({
          role: n.role?.value ?? '',
          name: String(n.name?.value ?? ''),
          id,
          under,
          axes: n.backendDOMNodeId ? (scrolling.get(n.backendDOMNodeId) ?? '') : '',
        });
      }
      for (const child of n.childIds ?? []) {
        const c = byId.get(child);
        if (c) visit(c, id && !n.ignored ? id : under);
      }
    };
    visit(nodes[0], '');
    return out;
  } finally {
    await cdp.detach();
  }
}

interface DomNode {
  backendNodeId: number;
  attributes?: string[];
  children?: DomNode[];
  shadowRoots?: DomNode[];
  contentDocument?: DomNode;
}

function write(name: string, lines: string[]): void {
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, name), `${lines.join('\n')}\n`);
}

/** The ids of the Lobby's own scrollers, in order, from a list of scrollers. */
const SCROLLER_IDS = /^(lobby_pager|lobby_top_row|lobby_page|lobby_chips|lobby_row_\d|lobby_inner_list|lobby_board)\b/;

test.describe('the Lobby, in the tree Appium reads', () => {
  test('WEBVIEW (the DOM): the pager first, the Top 10 row first with it off, the pager and Saved absent', async ({ page }, info) => {
    const problems = await guard(page);
    await openLobby(page);
    await page.waitForTimeout(300);

    // pager on
    const on = await domScrollers(page);
    expect(on.documentScrolls, 'the document itself does not scroll').toBe(false);
    const onNames = on.scrollers.map((s) => s.name);
    expect(onNames[0]).toBe('lobby_pager');
    expect(onNames[1]).toBe('lobby_top_row');
    // the page is ion-content's own scroller, in its shadow root, under the element that carries lobby_page
    expect(onNames[2]).toBe('lobby_page › div.inner-scroll.scroll-y');
    expect(onNames.slice(3)).toEqual(['lobby_chips', 'lobby_row_1', 'lobby_row_2', 'lobby_row_3', 'lobby_row_4', 'lobby_inner_list', 'lobby_board']);
    expect(on.scrollers.map((s) => s.axes)).toEqual(['x', 'x', 'y', 'x', 'x', 'x', 'x', 'x', 'y', 'xy']);

    // pager off: out of the DOM, not hidden
    await page.click('#lobby_pager_shown');
    await expect(page.locator('#lobby_pager')).toHaveCount(0);
    for (const id of ['lobby_pager_position', 'lobby_pager_auto', 'lobby_banner_1', 'lobby_banner_5']) await expect(page.locator(`#${id}`)).toHaveCount(0);
    await expect(page.locator('.mg-lobby-pager, .mg-lobby-pager-page, .mg-lobby-dots')).toHaveCount(0);
    const off = await domScrollers(page);
    expect(off.scrollers.map((s) => s.name)[0]).toBe('lobby_top_row');
    expect(off.scrollers.map((s) => s.name).slice(1, 3)).toEqual(['lobby_page › div.inner-scroll.scroll-y', 'lobby_chips']);
    await expect(page.locator('#lobby_touch_log')).toHaveText('Nothing touched');

    // and back on, at the banner it showed
    await page.click('#lobby_pager_shown');
    await expect(page.locator('#lobby_pager')).toHaveCount(1);
    expect((await domScrollers(page)).scrollers[0].name).toBe('lobby_pager');

    // Saved: out of the DOM until its delay has passed (3 s here; Vitest checks 12 s on a fake clock)
    await expect(page.locator('#lobby_bar_saved')).toHaveCount(1);
    await page.click('#lobby_saved_delay_3');
    const chosenAt = Date.now();
    await expect(page.locator('#lobby_bar_saved')).toHaveCount(0);
    await expect(page.locator('#lobby_bar ion-tab-button')).toHaveCount(3);
    await page.locator('#lobby_bar_saved').waitFor({ state: 'attached', timeout: 5000 });
    const after = Date.now() - chosenAt;
    expect(after).toBeGreaterThanOrEqual(2900);
    await expect(page.locator('#lobby_touch_log')).toHaveText('Nothing touched');

    if (info.project.name === 'light') {
      write('webview-scrollables-pager-on.txt', on.scrollers.map((s) => `${s.name}  ${s.axes}  ${s.rect}`));
      write('webview-scrollables-pager-off.txt', off.scrollers.map((s) => `${s.name}  ${s.axes}  ${s.rect}`));
    }
    expect(problems).toEqual([]);
  });

  test('NATIVE, as Chromium exposes it: the same order in its accessibility tree, the pager and Saved absent', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the DevTools protocol is Chromium’s');
    await openLobby(page);
    await page.click('#lobby_saved_delay_20');
    await page.waitForTimeout(300);

    const on = await axTree(page);
    const scrollOn = on.filter((n) => n.axes);
    const named = (list: typeof on) => list.map((n) => n.id || `${n.under} › (${n.role}, no id)`);
    // the pager is the first scrollable node, then the Top 10 row, then the page's scroller (no id of its own)
    expect(named(scrollOn).slice(0, 3)).toEqual(['lobby_pager', 'lobby_top_row', 'lobby_page › (generic, no id)']);
    expect(named(scrollOn).slice(3).filter((n) => SCROLLER_IDS.test(n))).toEqual([
      'lobby_chips',
      'lobby_row_1',
      'lobby_row_2',
      'lobby_row_3',
      'lobby_row_4',
      'lobby_inner_list',
      'lobby_board',
    ]);
    // each tile, banner and cell is a node of its own, a button, with its id
    const tile = on.find((n) => n.id === 'lobby_top_row_tile_2')!;
    expect(tile.role).toBe('button');
    expect(tile.name).toBe('Pocket Notebook');
    expect(on.find((n) => n.id === 'lobby_banner_1')!.role).toBe('button');
    expect(on.find((n) => n.id === 'lobby_board_cell_m18')!.role).toBe('button');
    // Saved is not a node before its delay
    expect(on.some((n) => n.id === 'lobby_bar_saved')).toBe(false);
    expect(on.some((n) => n.name === 'Saved')).toBe(false);

    await page.click('#lobby_pager_shown');
    await expect(page.locator('#lobby_pager')).toHaveCount(0);
    const off = await axTree(page);
    const scrollOff = off.filter((n) => n.axes);
    expect(named(scrollOff)[0]).toBe('lobby_top_row');
    for (const id of ['lobby_pager', 'lobby_pager_position', 'lobby_pager_auto', 'lobby_banner_1']) expect(off.some((n) => n.id === id), id).toBe(false);
    expect(off.some((n) => n.name === 'Banner 1 of 5' || n.name.startsWith('New in the Kitchen aisle'))).toBe(false);

    const line = (n: (typeof on)[number]) => `${n.id || `${n.under} › (no id)`}  ${n.role}  ${n.axes}${n.name ? `  "${n.name.slice(0, 40)}"` : ''}`;
    write('native-chromium-scrollables-pager-on.txt', scrollOn.map(line));
    write('native-chromium-scrollables-pager-off.txt', scrollOff.map(line));
    write(
      'native-chromium-tree-pager-on.txt',
      on.filter((n) => n.id || n.axes).map(line),
    );
  });
});
