import { act, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getState } from '../src/data/store';
import { fakePlatform } from './fakePlatform';
import { byId, doesNotShow, gone, ionEvent, pause, presented, renderApp, shows, signedIn, tap, text, typeInto, user } from './helpers';

/** The flows of scenarios 01–10 (nthcase/scenarios), step by step, with their checks. */
describe('scenario flows', () => {
  it('01 · signs in with the test account after a wrong password', async () => {
    renderApp();
    await shows('Mossgrove');
    await shows('Home and desk goods');
    await tap('signin_submit');
    expect(await text('signin_error')).toBe('Enter your email and password');
    await typeInto('signin_email', 'tester@mossgrove.test');
    await typeInto('signin_password', 'letmein1');
    await tap('signin_submit');
    expect(await text('signin_error')).toBe('Wrong email or password');
    const password = await byId<HTMLInputElement>('signin_password');
    expect(password.type).toBe('password');
    expect((await byId('signin_password_toggle')).getAttribute('aria-label')).toBe('Show password');
    await tap('signin_password_toggle');
    await waitFor(() => expect(document.querySelector<HTMLInputElement>('#signin_password')?.type).toBe('text'));
    expect((await byId<HTMLInputElement>('signin_password')).value).toBe('letmein1');
    expect((await byId('signin_password_toggle')).getAttribute('aria-label')).toBe('Hide password');
    await typeInto('signin_password', 'Mossgrove123', { replace: true });
    await tap('signin_submit');
    await byId('shop_screen');
    await shows('Stoneware Mug');
    expect(await text('shop_count')).toBe('40 drawers · No. 001–040');
  });

  it('01 · "Use test account" fills both fields', async () => {
    renderApp();
    await tap('signin_use_test_account');
    await pause(50);
    expect((await byId<HTMLInputElement>('signin_email')).value).toBe('tester@mossgrove.test');
    expect((await byId<HTMLInputElement>('signin_password')).value).toBe('Mossgrove123');
    await tap('signin_submit');
    await byId('shop_screen');
  });

  it('02 · searches, clears, finds the last drawer, refreshes, and finds by number', async () => {
    await signedIn();
    await typeInto('shop_search', 'lamp');
    await waitFor(async () => expect(await text('shop_count')).toBe('4 of 40 drawers'));
    await shows('Floor Lamp');
    await tap('shop_search_clear');
    await waitFor(async () => expect(await text('shop_count')).toBe('40 drawers · No. 001–040'));
    await gone('shop_search_clear');
    await typeInto('shop_search', 'velvet');
    await shows('No drawers match "velvet"');
    expect(await text('shop_empty_action')).toBe('Clear search');
    await tap('shop_empty_action');
    await gone('shop_empty');
    expect(await text('shop_item_40')).toContain('Fruit Bowl');
    expect(await text('shop_item_40')).toContain('No. 040');
    const refresher = document.querySelector('ion-refresher')!;
    await act(async () => {
      refresher.dispatchEvent(new CustomEvent('ionRefresh', { detail: { complete: () => Promise.resolve() } }));
    });
    expect(document.getElementById('snackbar')).toBeNull();
    await waitFor(async () => expect(await text('snackbar_text')).toBe('Catalogue is up to date'), { timeout: 2000 });
    await typeInto('shop_search', '7');
    await waitFor(() => expect(document.querySelectorAll('#shop_list [id^="shop_item_"]')).toHaveLength(1));
    expect(await text('shop_item_7')).toContain('Wall Clock');
  });

  it('03 · fills the cart, checks out through the dialog, and lists the order', async () => {
    await signedIn();
    await tap('shop_item_1');
    expect(await text('item_number')).toBe('No. 001');
    expect(await text('item_price')).toBe('$14.00');
    expect(await text('item_qty_value')).toBe('1');
    expect((await byId('item_qty_decrease')).hasAttribute('disabled')).toBe(true);
    await tap('item_qty_increase');
    expect(await text('item_qty_value')).toBe('2');
    expect(await text('item_add_to_cart')).toBe('Add to cart · $28.00');
    await tap('item_add_to_cart');
    expect(await text('snackbar_text')).toBe('Added to cart');
    expect((await byId('nav_cart').catch(() => null)) === null).toBe(true); // below a tab: no tab bar
    await tap('snackbar_action');
    await byId('cart_screen');
    expect(await text('cart_total')).toBe('$28.00');
    await waitFor(() => {
      const tab = document.getElementById('nav_cart')!;
      expect(tab.getAttribute('aria-label')).toBe('Cart, 2 items');
      expect(tab.shadowRoot?.querySelector('a')?.getAttribute('aria-label')).toBe('Cart, 2 items');
    });
    await tap('nav_shop');
    await tap('shop_item_5');
    await tap('item_add_to_cart');
    await tap('top_bar_back'); // screens below a tab have no tab bar, as on Android
    await tap('nav_cart');
    expect(await text('cart_total')).toBe('$70.00');
    await tap('cart_line_remove_1');
    await doesNotShow('Stoneware Mug');
    expect(await text('cart_total')).toBe('$42.00');
    const orderTotal = await text('cart_total');
    await tap('cart_checkout');
    expect(await text('dialog_title')).toBe('Place this order?');
    expect(await text('dialog_text')).toBe('1 item · $42.00. This is a sample shop: nothing is charged or shipped.');
    await tap('dialog_dismiss');
    await gone('dialog');
    await shows('Brass Desk Lamp');
    await tap('cart_checkout');
    await tap('dialog_confirm');
    await gone('dialog');
    expect(await text('snackbar_text')).toBe('Order 1 placed');
    await shows('Your cart is empty');
    expect(fakePlatform.posted).toEqual([]); // order updates are off
    await tap('snackbar_action');
    await byId('orders_screen');
    expect(await text('orders_row_1')).toContain('Order 1');
    expect(await text('orders_row_1')).toContain(orderTotal);
    expect(await text('orders_row_1')).toContain('1 item · Brass Desk Lamp');
  });

  it('04 · shows every form error at once, follows edits, and joins', async () => {
    await signedIn();
    await tap('nav_lab');
    await tap('lab_form');
    await byId('form_screen');
    await tap('form_submit');
    for (const id of ['name', 'email', 'age', 'password', 'category', 'date', 'terms']) await byId(`form_${id}_error`);
    await shows('Enter your name');
    await shows('Enter a valid email address');
    await shows('Enter an age from 18 to 120');
    await shows('Accept the terms to continue');
    await typeInto('form_name', 'Sam Rivera');
    await gone('form_name_error');
    await typeInto('form_email', 'sam@example');
    await shows('Enter a valid email address');
    await typeInto('form_email', '.test');
    await doesNotShow('Enter a valid email address');
    await typeInto('form_age', '3x4');
    await waitFor(async () => expect((await byId<HTMLInputElement>('form_age')).value).toBe('34'));
    await typeInto('form_password', 'garden42x');
    await tap('form_password_toggle');
    await waitFor(() => expect(document.querySelector<HTMLInputElement>('#form_password')?.type).toBe('text'));
    expect((await byId<HTMLInputElement>('form_password')).value).toBe('garden42x');

    await tap('form_category');
    for (const key of ['kitchen', 'desk', 'garden', 'home']) expect((await byId(`form_category_option_${key}`)).tagName).toBe('BUTTON');
    await presented('ion-action-sheet');
    await tap('form_category_option_garden');
    await gone('form_category_option_garden');
    await waitFor(async () => expect((await byId<HTMLInputElement>('form_category')).value).toBe('Garden'));

    await tap('form_date');
    await byId('form_date_picker');
    expect((await byId('form_date_confirm')).hasAttribute('disabled')).toBe(true);
    const now = new Date();
    const fifteenth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
    await ionEvent('form_date_picker', 'ionChange', { value: fifteenth });
    await tap('form_date_confirm');
    await gone('form_date_picker');
    const dateField = document.getElementById('form_date')!.closest('ion-input') as HTMLIonInputElement;
    await waitFor(() => expect(String(dateField.value)).toMatch(/^15 [A-Z][a-z]{2} \d{4}$/));

    await tap('form_newsletter');
    await waitFor(() => expect((document.getElementById('form_newsletter') as HTMLIonToggleElement).checked).toBe(true));
    await ionEvent('form_budget', 'ionInput', { value: 120 });
    expect(await text('form_budget_value')).toBe('$120');
    await tap('form_terms');
    await gone('form_terms_error');
    await tap('form_submit');
    const result = await text('form_result');
    expect(result).toMatch(/^Welcome, Sam Rivera\. We'll write to sam@example\.test about the Garden aisle and deliver on 15 [A-Z][a-z]{2} \d{4}\.$/);
    expect(await text('snackbar_text')).toBe('Welcome to the club');
    for (const id of ['name', 'email', 'age', 'password', 'category', 'date', 'terms']) expect(document.getElementById(`form_${id}_error`)).toBeNull();
  });

  it('05 · answers every gesture with its status word', async () => {
    await signedIn();
    await tap('nav_lab');
    await tap('lab_gestures');
    expect(await text('gestures_status')).toBe('Ready');
    expect(await text('gestures_orientation')).toBe('Portrait');
    const status = () => text('gestures_status');

    await tap('gestures_tap');
    expect(await status()).toBe('Tapped');
    expect(await text('gestures_tap_count')).toBe('Taps: 1');

    const double = await byId('gestures_double_tap');
    fireEvent.pointerUp(double, { clientX: 10, clientY: 10 });
    expect(await status()).toBe('Tapped'); // one tap is not a double tap
    fireEvent.pointerUp(double, { clientX: 12, clientY: 11 });
    await waitFor(async () => expect(await status()).toBe('Double-tapped'));

    const long = await byId('gestures_long_press');
    fireEvent.pointerDown(long, { clientX: 5, clientY: 5 });
    await pause(200);
    fireEvent.pointerUp(long);
    await pause(400);
    expect(await status()).toBe('Double-tapped'); // let go too soon
    fireEvent.pointerDown(long, { clientX: 5, clientY: 5 });
    await pause(550);
    expect(await status()).toBe('Long-pressed');
    fireEvent.pointerUp(long);

    const swipe = await byId('gestures_swipe');
    const swipes: [number, number, string][] = [
      [-80, 5, 'left'],
      [80, -5, 'right'],
      [5, -80, 'up'],
      [-5, 80, 'down'],
    ];
    for (const [dx, dy, word] of swipes) {
      fireEvent.pointerDown(swipe, { pointerId: 1, clientX: 150, clientY: 150 });
      fireEvent.pointerUp(swipe, { pointerId: 1, clientX: 150 + dx, clientY: 150 + dy });
      expect(await status()).toBe(`Swiped ${word}`);
    }
    fireEvent.pointerDown(swipe, { pointerId: 1, clientX: 150, clientY: 150 });
    fireEvent.pointerUp(swipe, { pointerId: 1, clientX: 170, clientY: 150 });
    expect(await status()).toBe('Swiped down'); // 20 px is not a swipe

    const source = await byId('gestures_drag_source');
    const target = await byId('gestures_drop_target');
    source.getBoundingClientRect = () => new DOMRect(16, 300, 120, 56);
    target.getBoundingClientRect = () => new DOMRect(160, 280, 180, 96);
    fireEvent.pointerDown(source, { pointerId: 2, clientX: 70, clientY: 320 });
    fireEvent.pointerMove(source, { pointerId: 2, clientX: 70, clientY: 500 });
    fireEvent.pointerUp(source, { pointerId: 2, clientX: 70, clientY: 500 });
    expect(await status()).toBe('Dropped outside the drawer');
    expect(target).toHaveAttribute('aria-label', 'Drawer, no label');
    fireEvent.pointerDown(source, { pointerId: 3, clientX: 70, clientY: 320 });
    fireEvent.pointerMove(source, { pointerId: 3, clientX: 250, clientY: 330 });
    fireEvent.pointerUp(source, { pointerId: 3, clientX: 250, clientY: 330 });
    expect(await status()).toBe('Dropped on the drawer');
    expect(target).toHaveAttribute('aria-label', 'Drawer, labelled');

    const pinch = await byId('gestures_pinch');
    fireEvent.pointerDown(pinch, { pointerId: 4, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(pinch, { pointerId: 5, clientX: 120, clientY: 100 });
    fireEvent.pointerMove(pinch, { pointerId: 5, clientX: 140, clientY: 100 });
    fireEvent.pointerUp(pinch, { pointerId: 5, clientX: 140, clientY: 100 });
    fireEvent.pointerUp(pinch, { pointerId: 4, clientX: 100, clientY: 100 });
    expect(await status()).toBe('Pinched out');
    expect(await text('gestures_zoom_value')).toBe('Zoom 2.0×');
    fireEvent.pointerDown(pinch, { pointerId: 6, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(pinch, { pointerId: 7, clientX: 200, clientY: 100 });
    fireEvent.pointerUp(pinch, { pointerId: 7, clientX: 150, clientY: 100 });
    fireEvent.pointerUp(pinch, { pointerId: 6, clientX: 100, clientY: 100 });
    expect(await status()).toBe('Pinched in');
    expect(await text('gestures_zoom_value')).toBe('Zoom 1.0×');

    const rotate = await byId('gestures_rotate');
    fireEvent.pointerDown(rotate, { pointerId: 8, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(rotate, { pointerId: 9, clientX: 150, clientY: 100 });
    fireEvent.pointerUp(rotate, { pointerId: 9, clientX: 100, clientY: 150 });
    fireEvent.pointerUp(rotate, { pointerId: 8, clientX: 100, clientY: 100 });
    expect(await status()).toBe('Rotated clockwise');
    expect(await text('gestures_rotation_value')).toBe('Rotation 90°');
    fireEvent.pointerDown(rotate, { pointerId: 10, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(rotate, { pointerId: 11, clientX: 100, clientY: 150 });
    fireEvent.pointerUp(rotate, { pointerId: 11, clientX: 150, clientY: 100 });
    fireEvent.pointerUp(rotate, { pointerId: 10, clientX: 100, clientY: 100 });
    expect(await status()).toBe('Rotated counter-clockwise');
    expect(await text('gestures_rotation_value')).toBe('Rotation 0°');

    await tap('gestures_scroll_target');
    expect(await status()).toBe('Found the bottom drawer');
    await act(async () => fakePlatform.shake());
    expect(await status()).toBe('Shaken');
  });

  it('05 · offers the double-tap, long-press and drag gestures to a keyboard or screen reader', async () => {
    await signedIn();
    await tap('nav_lab');
    await tap('lab_gestures');
    // A click with detail 0 is an activation without a pointer.
    fireEvent.click(await byId('gestures_double_tap'), { detail: 0 });
    expect(await text('gestures_status')).toBe('Double-tapped');
    fireEvent.click(await byId('gestures_long_press'), { detail: 0 });
    expect(await text('gestures_status')).toBe('Long-pressed');
    fireEvent.keyDown(await byId('gestures_swipe'), { key: 'ArrowUp' });
    expect(await text('gestures_status')).toBe('Swiped up');
    fireEvent.click(await byId('gestures_drag_source'), { detail: 0 });
    expect(await text('gestures_status')).toBe('Dropped on the drawer');
    // A real tap (detail 1) is not a double tap.
    fireEvent.click(await byId('gestures_double_tap'), { detail: 1 });
    expect(await text('gestures_status')).toBe('Dropped on the drawer');
  });

  it('06 · keeps the cart across Back and the tabs, signs in again after a restart, and leaves from the Shop', async () => {
    const view = await (async () => {
      await signedIn();
      return null;
    })();
    void view;
    await tap('shop_item_1');
    await tap('item_add_to_cart');
    await tap('nav_lab').catch(async () => {
      await act(async () => fakePlatform.pressBack());
      await tap('nav_lab');
    });
    await tap('lab_gestures');
    expect(await text('gestures_orientation')).toBe('Portrait');
    await act(async () => fakePlatform.pressBack());
    await byId('lab_screen');
    await shows('Join the club');
    await tap('nav_cart');
    await shows('Stoneware Mug');
    await tap('nav_shop');
    // the system Back closes a dialog before it leaves a screen
    await tap('nav_cart');
    await tap('cart_checkout');
    await byId('dialog');
    await act(async () => fakePlatform.pressBack());
    await gone('dialog');
    await byId('cart_screen');
    await act(async () => fakePlatform.pressBack());
    await byId('shop_screen');
    await act(async () => fakePlatform.pressBack());
    expect(fakePlatform.exited).toBe(1);
  });

  it('06 · reads Portrait and Landscape from the screen', async () => {
    const listeners = new Set<() => void>();
    let landscape = false;
    const original = window.matchMedia;
    window.matchMedia = (query: string) =>
      ({
        get matches() {
          return query.includes('landscape') ? landscape : false;
        },
        media: query,
        addEventListener: (_: string, l: () => void) => listeners.add(l),
        removeEventListener: (_: string, l: () => void) => listeners.delete(l),
      }) as unknown as MediaQueryList;
    try {
      await signedIn();
      await tap('nav_lab');
      await tap('lab_gestures');
      expect(await text('gestures_orientation')).toBe('Portrait');
      await act(async () => {
        landscape = true;
        listeners.forEach((l) => l());
      });
      expect(await text('gestures_orientation')).toBe('Landscape');
    } finally {
      window.matchMedia = original;
    }
  });

  it('07 · shows the bundled care guide in a frame and says when it has loaded', async () => {
    await signedIn();
    await tap('nav_lab');
    await tap('lab_webview');
    expect(await text('webview_status')).toBe('Loading the care guide…');
    const frame = await byId<HTMLIFrameElement>('webview');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame.getAttribute('src')).toBe('care-guide.html');
    await act(async () => {
      frame.dispatchEvent(new Event('load'));
    });
    expect(await text('webview_status')).toBe('Care guide loaded');
  });

  it('08 · waits 3 s for the slots, fails once then retries, and loads the shop slowly', async () => {
    await signedIn();
    await tap('nav_lab');
    await tap('lab_slow');
    expect(await text('slow_loading')).toBe('Finding delivery slots…');
    await pause(2500);
    expect(document.getElementById('slow_content')).toBeNull();
    await byId('slow_content', 1500);
    expect(await text('slow_slot_1')).toBe('Monday · 8:00–10:00');
    expect(await text('slow_slot_5')).toBe('Saturday · 10:00–12:00');
    await tap('slow_reload');
    await byId('slow_loading');
    await tap('top_bar_back');
    await tap('lab_orders');
    await shows('No orders yet');
    await tap('top_bar_back');
    await tap('nav_settings');
    await tap('settings_fail_loading');
    await waitFor(() => expect(getState().failFirstLoad).toBe(true));
    await tap('nav_lab');
    await tap('lab_orders');
    await shows("Orders didn't load");
    await tap('orders_retry');
    await shows('No orders yet');
    await tap('top_bar_back');
    await tap('nav_settings');
    await tap('settings_fail_loading');
    await tap('settings_slow_loading');
    await waitFor(() => expect(getState()).toMatchObject({ failFirstLoad: false, slowLoading: true }));
    await tap('nav_shop');
    expect(await text('shop_loading')).toBe('Opening the drawers…');
    await byId('shop_item_1', 4000);
    await shows('Stoneware Mug');
    await tap('nav_cart');
    await shows('Your cart is empty');
  });

  it('08 · fails the shop\'s first load on each visit, until Try again', async () => {
    await signedIn();
    await tap('nav_settings');
    await tap('settings_fail_loading');
    await tap('nav_shop');
    await shows("The catalogue didn't load");
    await tap('shop_retry');
    await byId('shop_item_1');
    await tap('nav_cart');
    await tap('nav_shop');
    await byId('shop_error');
  });

  it('09 · switches the theme, asks for notifications once, sends one, and confirms before emptying', async () => {
    await signedIn();
    await tap('nav_settings');
    expect(await text('settings_account_email')).toBe('tester@mossgrove.test');
    await waitFor(async () => expect(await text('settings_notifications_status')).toBe('Not allowed. Turn this on to be asked.'));
    expect((await byId('settings_send_notification')).hasAttribute('disabled')).toBe(true);
    await tap('settings_theme_dark');
    await waitFor(() => expect(document.documentElement).toHaveClass('ion-palette-dark'));
    expect((document.getElementById('settings_theme') as HTMLIonRadioGroupElement).value).toBe('dark');
    await tap('settings_theme_system');
    await waitFor(() => expect(document.documentElement).not.toHaveClass('ion-palette-dark'));
    await tap('settings_notifications');
    await waitFor(async () => expect(await text('settings_notifications_status')).toBe("On: we'll tell you when an order is placed."));
    expect(fakePlatform.prompts).toBe(1);
    await waitFor(async () => expect((await byId('settings_send_notification')).hasAttribute('disabled')).toBe(false));
    await tap('settings_send_notification');
    expect(fakePlatform.posted).toEqual([{ title: 'Your order is packed', body: 'A test notification from Mossgrove.' }]);
    expect(await text('snackbar_text')).toBe('Notification sent');
    await tap('settings_notifications');
    await waitFor(async () => expect(await text('settings_notifications_status')).toBe('Off'));
    expect(fakePlatform.prompts).toBe(1);
    await tap('settings_reset');
    await presented('ion-alert');
    expect((await byId('settings_reset_confirm')).tagName).toBe('BUTTON');
    await shows('Empty the cart and orders?');
    await shows("You stay signed in. This can't be undone.");
    await tap('settings_reset_cancel');
    await gone('settings_reset_cancel');
    await tap('settings_sign_out');
    await byId('signin_screen');
    await shows('Test account');
  });

  it('09 · stays off when notifications are refused, and posts "Order 1 placed" when they are on', async () => {
    fakePlatform.answer = false;
    await signedIn();
    await tap('nav_settings');
    await tap('settings_notifications');
    await waitFor(() => expect(fakePlatform.prompts).toBe(1));
    expect(await text('settings_notifications_status')).toBe('Not allowed. Turn this on to be asked.');
    await waitFor(() => expect((document.getElementById('settings_notifications') as HTMLIonToggleElement).checked).toBe(false));
    fakePlatform.answer = true;
    await tap('settings_notifications');
    await waitFor(() => expect(getState().orderUpdates).toBe(true));
    await tap('nav_shop');
    await tap('shop_item_3');
    await tap('item_add_to_cart');
    await tap('snackbar_action');
    await tap('cart_checkout');
    await tap('dialog_confirm');
    expect(fakePlatform.posted).toEqual([{ title: 'Order 1 placed', body: "We're packing it now." }]);
    await tap('nav_settings');
    await tap('settings_reset');
    await presented('ion-alert');
    await tap('settings_reset_confirm');
    expect(await text('snackbar_text')).toBe('Cart and orders emptied');
    expect(getState().orders).toEqual([]);
    expect(getState().signedInEmail).toBe('tester@mossgrove.test');
  });

  it('10 · gift cards: found by text, label and position', async () => {
    await signedIn();
    await tap('nav_lab');
    await tap('lab_gift_cards');
    await shows('Check a balance');
    const code = await waitFor(() => {
      const input = document.querySelector<HTMLInputElement>('ion-input input');
      if (!input) throw new Error('no input yet');
      return input;
    });
    await act(async () => {
      await user().type(code, 'moss-0025');
    });
    await waitFor(() => expect(code.value).toBe('MOSS-0025'));
    const button = (label: string, index = 0) => [...document.querySelectorAll('ion-button')].filter((b) => b.textContent?.trim() === label)[index] as HTMLElement;
    fireEvent.click(button('Check balance'));
    await shows('Balance: $25.00');
    await act(async () => {
      const u = user();
      await u.clear(code);
      await u.type(code, 'MOSS-9999');
    });
    fireEvent.click(button('Check balance'));
    await shows("We don't recognise that code");
    fireEvent.click([...document.querySelectorAll('ion-chip')].find((c) => c.textContent?.trim() === '$50')!);
    await shows('Choose a design');
    fireEvent.click(button('Choose', 1));
    await shows('A $50 card with the Stone design');
    fireEvent.click(button('Choose', 0));
    await shows('A $50 card with the Fern design');
  });

  it('opens each tab at its first screen, whatever was open in it before', async () => {
    await signedIn();
    await tap('nav_lab');
    await tap('lab_form');
    await byId('form_screen');
    await act(async () => fakePlatform.pressBack());
    await tap('lab_orders');
    await tap('top_bar_back');
    await tap('lab_slow');
    await act(async () => fakePlatform.pressBack());
    await tap('lab_gestures');
    await act(async () => fakePlatform.pressBack());
    await tap('nav_cart');
    await tap('nav_lab');
    await byId('lab_screen');
    expect(document.getElementById('form_screen')).toBeNull();
    await tap('nav_settings');
    await tap('settings_orders');
    await byId('orders_screen');
    await tap('top_bar_back');
    await byId('settings_screen');
  });

  it('11 · deep link: asks for sign-in first, opens No. 007, and Back lands on the Shop', async () => {
    fakePlatform.launch = 'nthcase-sample://item/7';
    renderApp();
    await byId('signin_screen');
    await tap('signin_use_test_account');
    await tap('signin_submit');
    expect(await text('item_name')).toBe('Wall Clock');
    expect(await text('item_number')).toBe('No. 007');
    await tap('top_bar_back');
    await byId('shop_screen');
    await shows('Stoneware Mug');
    await act(async () => fakePlatform.openUrl('nthcase-sample://item/999'));
    await shows('No drawer has the number "999"');
    expect(await text('top_bar_title')).toBe('Not found');
    await tap('item_not_found_action');
    await byId('shop_screen');
  });
});
