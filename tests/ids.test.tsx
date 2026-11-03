import { act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openDeepLink, push, setSetting, switchTab } from '../src/data/store';
import { idTemplates } from '../src/testIds';
import { byId, ionEvent, pause, presented, shows, signedIn, tap, typeInto, renderApp } from './helpers';

const root = join(import.meta.dirname, '..');
const spec = JSON.parse(readFileSync(join(root, 'nthcase/test-ids.json'), 'utf8')) as { spec: string; pattern: string; ids: { id: string; screen: string }[] };
const specIds = spec.ids.map((entry) => entry.id);
const pageHtml = readFileSync(join(root, 'public/care-guide.html'), 'utf8');

/** The page's own ids, read from the bundled file as the browser does. */
function pageIds(): string[] {
  const doc = new DOMParser().parseFromString(pageHtml, 'text/html');
  return [...doc.querySelectorAll('[id]')].map((el) => {
    expect(el.getAttribute('data-testid'), `#${el.id} has the same data-testid`).toBe(el.id);
    return el.id;
  });
}

/** A concrete id matches a JSON id: exactly, or by its template ("shop_item_{id}" matches "shop_item_7"). */
function templateOf(id: string): string | undefined {
  return specIds.find((t) => t === id || new RegExp(`^${t.replace(/\{(id|n)\}/, '\\d+').replace('{key}', '(kitchen|desk|garden|home)')}$`).test(id));
}

describe('the id list (SPEC.md §7)', () => {
  it('is spec 1.0 with 147 ids, all snake_case', () => {
    expect(spec.spec).toBe('1.0');
    expect(specIds).toHaveLength(147);
    const shape = new RegExp(spec.pattern);
    for (const id of specIds) expect(id.replace(/\{\w+\}/, 'x'), id).toMatch(shape);
  });

  it('is exactly the app ids plus the care guide page ids', () => {
    const declared = [...idTemplates(), ...pageIds()].sort();
    expect(declared).toEqual([...specIds].sort());
    expect(new Set(declared).size).toBe(declared.length);
  });
});

describe('every id on its screen, in the state the spec names', () => {
  it('reaches each of the 138 app ids in the rendered DOM, on the element a person acts on, once each', async () => {
    const seen = new Map<string, string>(); // id → tag of the element that carries it

    /** Collects every id on screen now, and checks each one as it goes. */
    const look = () => {
      const tagged = [...document.querySelectorAll<HTMLElement>('[data-testid]')];
      for (const el of tagged) {
        const id = el.getAttribute('data-testid')!;
        expect(el.id, `${id}: id and data-testid agree`).toBe(id);
        expect(document.querySelectorAll(`[id="${id}"]`), `${id}: one element only`).toHaveLength(1);
        expect(templateOf(id), `${id} is a spec id`).toBeDefined();
        // Inside an ion-input the id sits on the native <input> a person types into, never on the wrapper.
        if (el.closest('ion-input') && el.tagName !== 'ION-BUTTON') expect(el.tagName, id).toBe('INPUT');
        seen.set(id, el.tagName);
      }
    };

    // Sign in: the screen, then the refused sign-in.
    renderApp();
    await byId('signin_screen');
    look();
    await tap('signin_submit');
    await byId('signin_error');
    look();
    await tap('signin_use_test_account');
    await tap('signin_submit');

    // Shop: loaded with all 40 rows; searching; no match.
    await byId('shop_item_40');
    look();
    await typeInto('shop_search', 'velvet');
    await byId('shop_empty');
    look();
    await tap('shop_empty_action');

    // Item, Add to cart and its snackbar with an action.
    await tap('shop_item_7');
    await byId('item_add_to_cart');
    look();
    await tap('item_add_to_cart');
    await byId('snackbar_action');
    look();

    // Cart with a line, the dialog, then empty after the order.
    await tap('snackbar_action');
    await byId('cart_line_7');
    look();
    await tap('cart_checkout');
    await byId('dialog_confirm');
    look();
    await tap('dialog_confirm');
    await byId('cart_empty');
    look();

    // Orders: a list (from the order placed above), then empty, failed, loading.
    await tap('snackbar_action');
    await byId('orders_row_1');
    look();
    await act(async () => switchTab('lab'));
    await act(async () => {
      setSetting({ failFirstLoad: true });
    });
    await tap('lab_orders');
    await byId('orders_retry');
    look();
    await tap('top_bar_back');
    await act(async () => setSetting({ failFirstLoad: false, slowLoading: true }));
    await tap('lab_orders');
    await byId('orders_loading');
    look();
    await tap('top_bar_back');
    await act(async () => setSetting({ slowLoading: false }));
    await act(async () => switchTab('settings'));
    await tap('settings_reset');
    await presented('ion-alert');
    await byId('settings_reset_confirm');
    look();
    await tap('settings_reset_confirm');
    await tap('settings_orders');
    await byId('orders_empty');
    look();
    await tap('top_bar_back');

    // Shop, slow and failing.
    await act(async () => setSetting({ slowLoading: true }));
    await tap('nav_shop');
    await byId('shop_loading');
    look();
    await act(async () => setSetting({ slowLoading: false, failFirstLoad: true }));
    await tap('nav_cart');
    await tap('nav_shop');
    await byId('shop_retry');
    look();
    await act(async () => setSetting({ failFirstLoad: false }));

    // The Lab and its benches.
    await tap('nav_lab');
    await byId('lab_gift_cards');
    look();
    await tap('lab_form');
    await tap('form_submit');
    await byId('form_terms_error');
    look();
    await tap('form_category');
    await presented('ion-action-sheet');
    await byId('form_category_option_home');
    look();
    await tap('form_category_option_home');
    await tap('form_date');
    await byId('form_date_confirm');
    look();
    const now = new Date();
    await ionEvent('form_date_picker', 'ionChange', { value: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15` });
    await tap('form_date_confirm');
    await typeInto('form_name', 'Sam Rivera');
    await typeInto('form_email', 'sam@example.test');
    await typeInto('form_age', '34');
    await typeInto('form_password', 'garden42x');
    await tap('form_terms');
    await tap('form_submit');
    await byId('form_result');
    look();
    await tap('top_bar_back');

    await tap('lab_gestures');
    await byId('gestures_scroll_target');
    look();
    await tap('top_bar_back');

    await tap('lab_webview');
    await byId('webview');
    look();
    await tap('top_bar_back');

    await tap('lab_slow');
    await byId('slow_loading');
    look();
    await byId('slow_reload', 4000);
    look();
    await tap('top_bar_back');

    // Settings.
    await tap('nav_settings');
    await byId('settings_version');
    look();

    // The deep link's unknown item.
    await act(async () => openDeepLink('999'));
    await byId('item_not_found_action');
    look();

    // Every JSON id has been seen at least once, in some concrete form.
    const appTemplates = idTemplates();
    const missing = appTemplates.filter((t) => ![...seen.keys()].some((id) => templateOf(id) === t));
    expect(missing).toEqual([]);
    for (let n = 1; n <= 40; n++) expect(seen.has(`shop_item_${n}`), `shop_item_${n}`).toBe(true);
    for (let n = 1; n <= 5; n++) expect(seen.has(`slow_slot_${n}`), `slow_slot_${n}`).toBe(true);
    for (const key of ['kitchen', 'desk', 'garden', 'home']) expect(seen.get(`form_category_option_${key}`)).toBe('BUTTON');
    // the controls a person types into are native inputs
    for (const id of ['signin_email', 'signin_password', 'shop_search', 'form_name', 'form_email', 'form_age', 'form_password', 'form_category']) {
      expect(seen.get(id), id).toBe('INPUT');
    }
    expect(seen.get('webview')).toBe('IFRAME');
    expect(seen.get('settings_reset_confirm')).toBe('BUTTON');
    expect(seen.get('settings_reset_cancel')).toBe('BUTTON');
    expect(seen.size).toBeGreaterThanOrEqual(appTemplates.length);
  }, 30000);

  it('has nothing at all on Gift cards: no id, no data-testid, the top bar included', async () => {
    await signedIn();
    await act(async () => push({ name: 'giftcards' }));
    await shows('Check a balance');
    await pause(100); // let ion-input draw (and lose) its own ids
    const page = document.querySelector('.mg-stage .ion-page')!;
    expect(page.querySelectorAll('[data-testid]')).toHaveLength(0);
    expect([...page.querySelectorAll('[id]')].map((el) => el.id)).toEqual([]);
    expect(page.id).toBe('');
    await shows('Choose a design');
  });
});
