import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';
import { guard, idsOnScreen, NOT_IN_THIS_APP, presented, signIn, specIds, templateOf } from './support';

/**
 * Walks every screen of the production build in Chromium, in the order round one drew them, and saves the 28
 * screenshots under the Android app's names into docs/screenshots/<light|dark>/ (01–24, and the Lobby's 25, 26, 27 and
 * 30; 28, 29 and 31 are the Android Views Lobby, which this app does not have). Along the way it collects every id in the
 * real DOM (the care guide's frame included) and checks the whole list was reached.
 *
 * These pictures show the web layer: what the app's web view draws. The system notification prompt, the status bar
 * and anything else the phone draws are not in them.
 */
test('@screens every screen, every id, in the real DOM', async ({ page }, info) => {
  test.setTimeout(240_000);
  const problems = await guard(page);
  const seen = new Set<string>();
  const look = async () => (await idsOnScreen(page)).forEach((id) => seen.add(id));
  // Pictures come from the Chromium runs, light and dark; the WebKit run walks the same screens without them.
  const pictures = info.project.name === 'light' || info.project.name === 'dark';
  // `animations: 'disabled'` fast-forwards or cancels the page's Web Animations; Ionic's sheet modal keeps its place
  // in its open animation, so the quick sheet is drawn with animations allowed (it has finished opening by then)
  const shot = async (name: string, animations: 'disabled' | 'allow' = 'disabled') => {
    await page.waitForTimeout(350);
    await look();
    if (pictures) await page.screenshot({ path: join(import.meta.dirname, '..', 'docs/screenshots', info.project.name, `${name}.png`), animations });
  };

  await page.goto('/');
  await expect(page.locator('#signin_screen')).toBeVisible();
  await shot('01-sign-in');
  await page.click('#signin_submit');
  await expect(page.locator('#signin_error')).toHaveText('Enter your email and password');
  await shot('02-sign-in-error');
  await signIn(page);
  await shot('03-shop');
  await page.fill('#shop_search', 'lamp');
  await expect(page.locator('#shop_count')).toHaveText('4 of 40 drawers');
  await shot('04-shop-search');
  await page.click('#shop_search_clear');
  await page.fill('#shop_search', 'velvet');
  await expect(page.locator('#shop_empty')).toBeVisible();
  await shot('05-shop-no-match');
  await page.click('#shop_empty_action');

  // every row, scrolled into view one by one
  for (let n = 1; n <= 40; n++) await page.locator(`#shop_item_${n}`).scrollIntoViewIfNeeded();
  await look();

  await page.click('#shop_item_5');
  await page.click('#item_qty_increase');
  await expect(page.locator('#item_add_to_cart')).toHaveText('Add to cart · $84.00');
  await shot('06-item');
  await page.click('#item_add_to_cart');
  await expect(page.locator('#snackbar_text')).toHaveText('Added to cart');
  await shot('07-item-snackbar');
  await page.click('#top_bar_back');
  await page.click('#shop_item_1');
  await page.click('#item_add_to_cart');
  await page.click('#snackbar_action');
  await expect(page.locator('#cart_total')).toHaveText('$98.00');
  await expect(page.locator('#snackbar')).toHaveCount(0);
  await shot('08-cart');
  await page.click('#cart_checkout');
  await presented(page, 'ion-modal.mg-dialog');
  await expect(page.locator('#dialog_title')).toHaveText('Place this order?');
  await shot('09-cart-dialog');
  await page.click('#dialog_confirm');
  await expect(page.locator('#cart_empty')).toBeVisible();
  await expect(page.locator('#snackbar_text')).toHaveText('Order 1 placed');
  await shot('10-cart-empty');
  await snackbarGoes(page); // round one waits the 10 s out too

  await page.click('#nav_lab');
  await shot('11-lab');
  await page.click('#lab_form');
  await page.click('#form_submit');
  await expect(page.locator('#form_terms_error')).toBeVisible();
  await page.locator('#form_screen ion-content').evaluate((el: HTMLIonContentElement) => el.scrollToTop());
  await shot('12-form-errors');
  await fillValidForm(page, look);
  await page.click('#form_submit');
  await expect(page.locator('#form_result')).toContainText('Welcome, Sam Rivera.');
  await page.locator('#form_result').scrollIntoViewIfNeeded();
  await shot('13-form-done');
  await snackbarGoes(page);
  await page.click('#top_bar_back');

  await page.click('#lab_gestures');
  await page.click('#gestures_tap');
  await expect(page.locator('#gestures_status')).toHaveText('Tapped');
  await page.locator('#gestures_scroll_target').scrollIntoViewIfNeeded();
  await look();
  await page.locator('#gestures_screen ion-content').evaluate((el: HTMLIonContentElement) => el.scrollToTop());
  await shot('14-gestures');
  await page.click('#top_bar_back');

  await page.click('#lab_webview');
  await expect(page.locator('#webview_status')).toHaveText('Care guide loaded');
  await expect(page.frameLocator('#webview').locator('#web_title')).toHaveText('Care guide');
  await shot('15-webview');
  await page.click('#top_bar_back');

  await page.click('#lab_slow');
  await expect(page.locator('#slow_loading')).toBeVisible();
  if (pictures) await page.screenshot({ path: join(import.meta.dirname, '..', 'docs/screenshots', info.project.name, '16-slow-loading.png'), animations: 'disabled' });
  await look();
  await expect(page.locator('#slow_content')).toBeVisible({ timeout: 5000 });
  await shot('17-slow-done');
  await page.click('#top_bar_back');

  await page.click('#lab_orders');
  await expect(page.locator('#orders_row_1')).toBeVisible();
  await shot('18-orders');
  await page.click('#top_bar_back');
  await page.click('#nav_settings');
  await page.click('#settings_reset');
  await presented(page, 'ion-alert');
  await shot('23-settings-dialog');
  await page.click('#settings_reset_confirm');
  await expect(page.locator('#snackbar_text')).toHaveText('Cart and orders emptied');
  await snackbarGoes(page);
  await page.click('#nav_lab');
  await page.click('#lab_orders');
  await expect(page.locator('#orders_empty')).toBeVisible();
  await shot('19-orders-empty');
  await page.click('#top_bar_back');
  await page.click('#nav_settings');
  await page.click('#settings_fail_loading');
  await page.click('#nav_lab');
  await page.click('#lab_orders');
  await expect(page.locator('#orders_error')).toBeVisible();
  await shot('20-orders-error');
  await page.click('#orders_retry');
  await expect(page.locator('#orders_empty')).toBeVisible();
  await page.click('#top_bar_back');

  // the shop's own error, and its slow load
  await page.click('#nav_shop');
  await expect(page.locator('#shop_retry')).toBeVisible();
  await look();
  await page.click('#nav_settings');
  await page.click('#settings_fail_loading');
  await page.click('#settings_slow_loading');
  await page.click('#nav_shop');
  await expect(page.locator('#shop_loading')).toBeVisible();
  await look();
  await page.click('#nav_lab');
  await page.click('#lab_orders');
  await expect(page.locator('#orders_loading')).toBeVisible();
  await look();
  await page.click('#top_bar_back');
  await page.click('#nav_settings');
  await page.click('#settings_slow_loading');

  await page.click('#nav_lab');
  await page.click('#lab_gift_cards');
  // no ids here: the left-hand "Choose" is Fern
  await page.getByRole('button', { name: 'Choose' }).first().click();
  await expect(page.getByText('A $25 card with the Fern design')).toBeVisible();
  // The document as Appium's WEBVIEW context reads it (CSS stays out of shadow roots, where Ionic keeps a few ids of
  // its own, such as ion-content's "background-content"): no id and no data-testid on this screen.
  const giftIds = await page.evaluate(() =>
    [...document.querySelectorAll('.mg-stage [id], .mg-stage [data-testid]')].map((el) => `${el.tagName}#${el.id}`),
  );
  expect(giftIds).toEqual([]);
  await shot('21-gift-cards');
  await page.click('[aria-label="Back"]');

  // The Lobby (spec 1.1): every scroller and what it holds is in the DOM at once
  await page.click('#lab_lobby');
  await expect(page.locator('#lobby_touch_log')).toHaveText('Nothing touched');
  await expect(page.locator('#lobby_pager_position')).toHaveAttribute('aria-label', 'Banner 1 of 5');
  await shot('25-lobby');
  // the board, one cell tapped
  await page.locator('#lobby_board_position').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.click('#lobby_board_cell_c3');
  await expect(page.locator('#lobby_touch_log')).toHaveText('Tapped: C3 (board)');
  await shot('26-lobby-board');
  // the quick sheet, from a long press on a Top 10 tile (the mouse held 700 ms)
  await page.locator('#lobby_page').evaluate((el: HTMLIonContentElement) => el.scrollToTop());
  const tile = (await page.locator('#lobby_top_row_tile_2').boundingBox())!;
  await page.mouse.move(tile.x + tile.width / 2, tile.y + 30);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await presented(page, 'ion-modal.mg-lobby-sheet');
  await expect(page.locator('#lobby_sheet_title')).toHaveText('Pocket Notebook');
  await shot('27-lobby-sheet', 'allow');
  await page.click('#lobby_sheet_open');
  await expect(page.locator('#lobby_detail')).toContainText('Top 10, tile 2');
  await look();
  await page.click('#lobby_detail_back');
  await page.click('#lobby_banner_1');
  await expect(page.locator('#lobby_promo')).toContainText('Banner 1 of 5');
  await look();
  await page.click('#lobby_promo_back');
  await page.click('#lobby_bar_saved');
  await expect(page.locator('#lobby_saved_screen')).toHaveText('Saved: nothing yet');
  await look();
  await page.click('#lobby_bar_home');
  // the pager off: the Top 10 row in its place
  await page.click('#lobby_touch_reset');
  await page.click('#lobby_pager_shown');
  await expect(page.locator('#lobby_pager')).toHaveCount(0);
  await shot('30-lobby-no-pager');
  await page.click('#lobby_pager_shown');
  await page.click('#top_bar_back');

  await page.click('#nav_settings');
  await expect(page.locator('#settings_notifications_status')).toHaveText('Not allowed. Turn this on to be asked.');
  await page.locator('#settings_screen ion-content').evaluate((el: HTMLIonContentElement) => el.scrollToTop());
  await shot('22-settings');

  // the deep link's unknown item (the address hash stands in for the link in a browser)
  // A cold start opened with the link: it asks for sign-in first, then opens the item.
  await page.goto('about:blank');
  await page.goto('/#item/999');
  await page.click('#signin_use_test_account');
  await page.click('#signin_submit');
  await expect(page.locator('#item_not_found')).toBeVisible();
  await expect(page.locator('#top_bar_title')).toHaveText('Not found');
  await shot('24-deep-link-unknown');

  // The whole list was reached, every concrete form of every template included.
  const missing = specIds.filter((t) => !NOT_IN_THIS_APP.includes(t) && ![...seen].some((id) => templateOf(id) === t));
  expect(missing, 'ids never seen in the real DOM').toEqual([]);
  for (let n = 1; n <= 40; n++) expect(seen.has(`shop_item_${n}`), `shop_item_${n}`).toBe(true);
  expect([...seen].filter((id) => id.startsWith('lobby_'))).toHaveLength(872);
  expect(problems).toEqual([]);
});

/** A snackbar stays 10 s (SPEC.md §5): it is still there just before, and gone just after. */
async function snackbarGoes(page: Page): Promise<void> {
  const shownAt = Number(await page.locator('#snackbar').getAttribute('data-shown-at'));
  await page.locator('#snackbar').waitFor({ state: 'detached', timeout: 12_000 });
  const lasted = (await page.evaluate(() => performance.now())) - shownAt;
  expect(lasted).toBeGreaterThanOrEqual(9_900);
  expect(lasted).toBeLessThan(11_500);
}

/** Fills the club form with valid answers, through the real controls. */
export async function fillValidForm(page: Page, look: () => Promise<void> = async () => {}): Promise<void> {
  await page.fill('#form_name', 'Sam Rivera');
  await page.fill('#form_email', 'sam@example.test');
  await page.fill('#form_age', '34');
  await page.fill('#form_password', 'garden42x');
  await page.click('#form_category');
  await presented(page, 'ion-action-sheet');
  await look();
  await page.click('#form_category_option_garden');
  await expect(page.locator('#form_category')).toHaveValue('Garden');
  await page.click('#form_date');
  await presented(page, 'ion-modal.mg-date-dialog');
  await look();
  // Playwright's CSS reaches into the date picker's shadow root; the shown month is the one in the middle.
  await page.locator('#form_date_picker .calendar-month:nth-child(2) [data-day="15"]').click();
  await page.click('#form_date_confirm');
  await expect(page.locator('ion-input:has(#form_date) input')).toHaveValue(/^15 [A-Z][a-z]{2} \d{4}$/);
  await page.click('#form_newsletter');
  const bar = await page.locator('#form_budget .range-bar-container').boundingBox();
  await page.mouse.click(bar!.x + bar!.width * 0.6, bar!.y + bar!.height / 2);
  await expect(page.locator('#form_budget_value')).toHaveText('$120');
  await page.click('#form_terms');
}
