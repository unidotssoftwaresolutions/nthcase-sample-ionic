import { describe, expect, it } from 'vitest';
import { DELIVERY_SLOTS, findItem, formatPrice, ITEMS, itemNumber, search } from '../src/data/catalog';
import {
  ageInput,
  credentialsMatch,
  deepLinkItemId,
  EMPTY_FORM,
  formatPickedDate,
  formErrors,
  FORM_ERRORS,
  ShakeDetector,
  swipeDirection,
} from '../src/data/rules';
import {
  addToCart,
  back,
  cartCount,
  currentTab,
  getState,
  openDeepLink,
  placeOrder,
  push,
  removeLine,
  resetData,
  setQuantity,
  signIn,
  signOut,
  switchTab,
  topRoute,
  totalCents,
} from '../src/data/store';

describe('the catalogue (SPEC.md §3)', () => {
  it('has the same 40 items, numbered and priced as the spec', () => {
    expect(ITEMS).toHaveLength(40);
    expect(ITEMS.map((i) => i.id)).toEqual(Array.from({ length: 40 }, (_, n) => n + 1));
    expect(findItem(1)).toMatchObject({ name: 'Stoneware Mug', category: 'kitchen', priceCents: 1400 });
    expect(findItem(25)).toMatchObject({ name: 'Floor Lamp', priceCents: 8900 });
    expect(findItem(40)).toMatchObject({ name: 'Fruit Bowl', category: 'kitchen', priceCents: 3400 });
    expect(findItem(0)).toBeUndefined();
    expect(findItem(41)).toBeUndefined();
    expect(itemNumber(7)).toBe('No. 007');
    expect(formatPrice(950)).toBe('$9.50');
    expect(formatPrice(8900)).toBe('$89.00');
    expect(DELIVERY_SLOTS).toEqual(['Monday · 8:00–10:00', 'Monday · 18:00–20:00', 'Wednesday · 12:00–14:00', 'Friday · 8:00–10:00', 'Saturday · 10:00–12:00']);
  });

  it('searches by name anywhere, ignoring case, or by number exactly', () => {
    expect(search('lamp').map((i) => i.name)).toEqual(['Brass Desk Lamp', 'Clip Reading Lamp', 'Floor Lamp', 'Bedside Lamp']);
    expect(search('LAMP')).toHaveLength(4);
    for (const q of ['7', '007', 'No. 007', 'no. 7']) expect(search(q).map((i) => i.id)).toEqual([7]);
    expect(search('   ')).toHaveLength(40);
    expect(search('velvet')).toEqual([]);
  });
});

describe('the cart and orders', () => {
  it('keeps one line per item in order of first adding, quantities 1 to 9, and a running total', () => {
    addToCart(1, 2);
    addToCart(5, 1);
    addToCart(1, 9);
    const { cart } = getState();
    expect(cart).toEqual([
      { itemId: 1, quantity: 9 },
      { itemId: 5, quantity: 1 },
    ]);
    setQuantity(5, 0);
    expect(getState().cart[1].quantity).toBe(1);
    expect(totalCents(getState().cart)).toBe(9 * 1400 + 4200);
    removeLine(1);
    expect(getState().cart).toEqual([{ itemId: 5, quantity: 1 }]);
    expect(() => addToCart(41, 1)).toThrow();
  });

  it('numbers orders from 1, newest first, and empties the cart', () => {
    addToCart(1, 1);
    expect(placeOrder().number).toBe(1);
    addToCart(2, 3);
    expect(placeOrder().number).toBe(2);
    expect(getState().orders.map((o) => o.number)).toEqual([2, 1]);
    expect(cartCount()).toBe(0);
    addToCart(3, 1);
    resetData();
    expect(getState().cart).toEqual([]);
    expect(getState().orders).toEqual([]);
  });
});

describe('the form rules (SPEC.md §5)', () => {
  it('names every invalid field with its spec text', () => {
    expect(formErrors(EMPTY_FORM)).toEqual({
      name: FORM_ERRORS.name,
      email: FORM_ERRORS.email,
      age: FORM_ERRORS.age,
      password: FORM_ERRORS.password,
      category: FORM_ERRORS.category,
      date: FORM_ERRORS.date,
      terms: FORM_ERRORS.terms,
    });
    const valid = { ...EMPTY_FORM, name: 'Sam', email: 'sam@example.test', age: '34', password: 'garden42x', category: 'garden' as const, date: '15 Nov 2026', terms: true };
    expect(formErrors(valid)).toEqual({});
    expect(formErrors({ ...valid, email: 'sam@example' }).email).toBe('Enter a valid email address');
    expect(formErrors({ ...valid, age: '17' }).age).toBeDefined();
    expect(formErrors({ ...valid, age: '121' }).age).toBeDefined();
    expect(formErrors({ ...valid, age: '120' }).age).toBeUndefined();
    expect(formErrors({ ...valid, password: 'gardenxyz' }).password).toBeDefined();
    expect(formErrors({ ...valid, password: 'garden4' }).password).toBeDefined();
    expect(FORM_ERRORS).toEqual({
      name: 'Enter your name',
      email: 'Enter a valid email address',
      age: 'Enter an age from 18 to 120',
      password: 'Use at least 8 characters, including a number',
      category: 'Choose a favourite aisle',
      date: 'Choose a delivery date',
      terms: 'Accept the terms to continue',
    });
  });

  it('keeps the age to three digits and writes the date as 15 Nov 2026', () => {
    expect(ageInput('3a4x99')).toBe('349');
    expect(formatPickedDate('2026-11-15')).toBe('15 Nov 2026');
    expect(formatPickedDate('2027-01-05T00:00:00')).toBe('5 Jan 2027');
  });

  it('checks the test account: email ignoring case and spaces, password exactly', () => {
    expect(credentialsMatch('  Tester@Mossgrove.TEST ', 'Mossgrove123')).toBe(true);
    expect(credentialsMatch('tester@mossgrove.test', 'mossgrove123')).toBe(false);
    expect(credentialsMatch('tester@mossgrove.test', 'letmein1')).toBe(false);
  });
});

describe('gestures', () => {
  it('reads a shake as three jolts over 2.5 g within one second', () => {
    let shakes = 0;
    const detector = new ShakeDetector(() => (shakes += 1));
    const g = 9.80665;
    detector.onReading(0, 0, g, 0); // resting: 1 g
    detector.onReading(3 * g, 0, 0, 100);
    detector.onReading(3 * g, 0, 0, 1200); // too late for the first
    detector.onReading(0, 3 * g, 0, 1500);
    expect(shakes).toBe(0);
    detector.onReading(0, 0, 3 * g, 1900);
    expect(shakes).toBe(1);
  });

  it('gives a swipe the direction of its longest axis, once it has travelled 48', () => {
    expect(swipeDirection(-60, 10, 48)).toBe('left');
    expect(swipeDirection(60, -59, 48)).toBe('right');
    expect(swipeDirection(5, -80, 48)).toBe('up');
    expect(swipeDirection(5, 80, 48)).toBe('down');
    expect(swipeDirection(40, 40, 48)).toBeNull();
  });
});

describe('deep links (SPEC.md §5)', () => {
  it('answers nthcase-sample://item/{id} and nothing else', () => {
    expect(deepLinkItemId('nthcase-sample://item/7')).toBe('7');
    expect(deepLinkItemId('nthcase-sample://item/999')).toBe('999');
    expect(deepLinkItemId('nthcase-sample://item/abc')).toBe('abc');
    expect(deepLinkItemId('nthcase-sample://item/')).toBeNull();
    expect(deepLinkItemId('nthcase-sample://cart/7')).toBeNull();
    expect(deepLinkItemId('nthcase-sample://item/7/more')).toBeNull();
    expect(deepLinkItemId('https://example.test/item/7')).toBeNull();
    expect(deepLinkItemId(null)).toBeNull();
  });

  it('waits for sign-in, then opens the item above the Shop', () => {
    openDeepLink('7');
    expect(topRoute().name).toBe('signin');
    signIn('tester@mossgrove.test');
    expect(getState().stack.map((e) => e.route)).toEqual([{ name: 'shop' }, { name: 'item', id: '7' }]);
    expect(back()).toBe(true);
    expect(topRoute().name).toBe('shop');
  });

  it('opens the item at once when signed in, and Back lands on the Shop whatever was open', () => {
    signIn('tester@mossgrove.test');
    switchTab('lab');
    push({ name: 'gestures' });
    openDeepLink('12');
    expect(getState().stack.map((e) => e.route.name)).toEqual(['shop', 'item']);
  });
});

describe('navigation (SPEC.md §4)', () => {
  it('opens a tab at its first screen, never at a deeper screen from before', () => {
    signIn('tester@mossgrove.test');
    switchTab('lab');
    push({ name: 'form' });
    switchTab('cart');
    switchTab('lab');
    expect(topRoute()).toEqual({ name: 'lab' });
    expect(currentTab()).toBe('lab');
    expect(getState().stack.map((e) => e.route.name)).toEqual(['shop', 'lab']);
  });

  it('goes back from another tab to the Shop, and from the Shop out of the app', () => {
    signIn('tester@mossgrove.test');
    switchTab('settings');
    expect(back()).toBe(true);
    expect(topRoute().name).toBe('shop');
    expect(back()).toBe(false);
  });

  it('keeps the Shop entry (and its search) across tab switches, and clears everything on sign-out', () => {
    signIn('tester@mossgrove.test');
    const shopKey = getState().stack[0].key;
    switchTab('cart');
    switchTab('shop');
    expect(getState().stack[0].key).toBe(shopKey);
    addToCart(1, 1);
    placeOrder();
    addToCart(2, 1);
    signOut();
    expect(getState().stack.map((e) => e.route.name)).toEqual(['signin']);
    expect(getState().cart).toEqual([]);
    expect(getState().orders).toEqual([]);
  });
});
