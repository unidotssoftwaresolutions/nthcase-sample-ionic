import { expect, test, type Page } from '@playwright/test';
import { guard, signIn } from './support';

/** What jsdom cannot show: the bundled page inside its frame, and gestures from real pointer and touch input. */
test.describe('in a real browser engine', () => {
  test('07 · the care guide: type, select, tick, save, jump, inside the frame', async ({ page }) => {
    const problems = await guard(page);
    await page.goto('/');
    await signIn(page);
    await page.click('#nav_lab');
    await page.click('#lab_webview');
    await expect(page.locator('#webview_status')).toHaveText('Care guide loaded');
    const frame = page.frameLocator('#webview');
    for (const id of ['web_title', 'web_more', 'web_form', 'web_name', 'web_frequency', 'web_agree', 'web_submit', 'web_result', 'web_washing']) {
      await expect(frame.locator(`#${id}`)).toHaveAttribute('data-testid', id);
    }
    await frame.locator('#web_submit').click();
    await expect(frame.locator('#web_result')).toHaveText('Enter your name first.');
    await frame.locator('#web_name').fill('Sam');
    await frame.locator('#web_frequency').selectOption({ label: 'Every week' });
    await frame.locator('#web_agree').check();
    await frame.locator('#web_submit').click();
    await expect(frame.locator('#web_result')).toHaveText('Saved, Sam. We will remind you every week.');
    await frame.locator('#web_more').click();
    await expect(frame.locator('#web_washing')).toBeInViewport();
    await expect(frame.locator('#web_washing')).toHaveText('Washing');
    // The frame is the app's own file, served from the app.
    expect(page.frames().map((f) => f.url().split('#')[0]).filter((u) => u.endsWith('/care-guide.html'))).toEqual(['http://localhost:4173/care-guide.html']);
    expect(problems).toEqual([]);
  });

  test('a link leaving the care guide is refused', async ({ page }) => {
    const problems = await guard(page);
    await page.goto('/');
    await signIn(page);
    await page.click('#nav_lab');
    await page.click('#lab_webview');
    await expect(page.locator('#webview_status')).toHaveText('Care guide loaded');
    const blocked: string[] = [];
    page.on('console', (m) => m.text().includes('CSP violation') && blocked.push(m.text()));
    await page.frameLocator('#webview').locator('body').evaluate(() => {
      const a = document.createElement('a');
      a.href = 'https://example.com/';
      a.id = 'away';
      document.body.append(a);
      a.click();
    });
    await page.waitForTimeout(500);
    expect(page.frames().some((f) => f.url().startsWith('https://example.com'))).toBe(false);
    // the only "problems" are the refusal itself
    expect(problems.filter((p) => !p.includes('example.com') && !p.includes('frame-src'))).toEqual([]);
  });

  test('05 · gestures from a real mouse and real touches', async ({ page, browserName }) => {
    const problems = await guard(page);
    await page.goto('/');
    await signIn(page);
    await page.click('#nav_lab');
    await page.click('#lab_gestures');
    const status = page.locator('#gestures_status');
    await expect(status).toHaveText('Ready');

    await page.click('#gestures_tap');
    await expect(status).toHaveText('Tapped');
    await expect(page.locator('#gestures_tap_count')).toHaveText('Taps: 1');
    await page.dblclick('#gestures_double_tap');
    await expect(status).toHaveText('Double-tapped');
    await press(page, '#gestures_long_press', 700);
    await expect(status).toHaveText('Long-pressed');

    for (const [dx, dy, word] of [[-120, 0, 'left'], [120, 0, 'right'], [0, -60, 'up'], [0, 60, 'down']] as const) {
      await drag(page, '#gestures_swipe', dx, dy);
      await expect(status).toHaveText(`Swiped ${word}`);
    }

    await page.dragAndDrop('#gestures_drag_source', '#gestures_drop_target');
    await expect(status).toHaveText('Dropped on the drawer');
    await expect(page.locator('#gestures_drop_target')).toHaveText('Labelled');

    // two fingers, through Chromium's touch input (Playwright drives multi-touch through Chromium only)
    if (browserName === 'chromium') {
      await twoFingers(page, '#gestures_pinch', { from: 20, to: 60, turn: 0 });
      await expect(status).toHaveText('Pinched out');
      await expect(page.locator('#gestures_zoom_value')).toHaveText('Zoom 3.0×');
      await twoFingers(page, '#gestures_rotate', { from: 40, to: 40, turn: 45 });
      await expect(status).toHaveText('Rotated clockwise');
      await expect(page.locator('#gestures_rotation_value')).toHaveText('Rotation 45°');
    }

    await page.locator('#gestures_scroll_target').scrollIntoViewIfNeeded();
    await page.click('#gestures_scroll_target');
    await expect(status).toHaveText('Found the bottom drawer');
    expect(problems).toEqual([]);
  });

  test('04 · every form control through its real input', async ({ page }) => {
    const problems = await guard(page);
    await page.goto('/');
    await signIn(page);
    await page.click('#nav_lab');
    await page.click('#lab_form');
    // typed key by key, as a person does: letters are dropped, three digits at most
    await page.locator('#form_age').pressSequentially('1a2b345');
    await expect(page.locator('#form_age')).toHaveValue('123');
    await page.click('#form_password_toggle');
    await expect(page.locator('#form_password')).toHaveAttribute('type', 'text');
    await page.click('#form_date');
    // An Ionic button says it is disabled with the attribute on its element (its native button is in the shadow root).
    await expect(page.locator('#form_date_confirm')).toHaveAttribute('disabled', '');
    await expect(page.locator('#form_date_confirm')).toHaveClass(/button-disabled/);
    await page.click('#form_date_cancel');
    await expect(page.locator('#form_date_picker')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
});

async function centre(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = (await page.locator(selector).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function press(page: Page, selector: string, ms: number): Promise<void> {
  const { x, y } = await centre(page, selector);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function drag(page: Page, selector: string, dx: number, dy: number): Promise<void> {
  const { x, y } = await centre(page, selector);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 });
  await page.mouse.move(x + dx, y + dy, { steps: 4 });
  await page.mouse.up();
}

/** Two touch points around the element's centre: `from` and `to` are half-distances apart, `turn` the degrees turned. */
async function twoFingers(page: Page, selector: string, { from, to, turn }: { from: number; to: number; turn: number }): Promise<void> {
  const { x, y } = await centre(page, selector);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const points = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [
      { x: x - r * Math.cos(a), y: y - r * Math.sin(a), id: 1 },
      { x: x + r * Math.cos(a), y: y + r * Math.sin(a), id: 2 },
    ];
  };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(from, 0) });
  for (let step = 1; step <= 6; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(from + ((to - from) * step) / 6, (turn * step) / 6) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
