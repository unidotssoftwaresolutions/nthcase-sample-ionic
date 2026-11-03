import { useSyncExternalStore } from 'react';
import { findItem } from './catalog';

export type Tab = 'shop' | 'cart' | 'lab' | 'settings';
export const TABS: readonly Tab[] = ['shop', 'cart', 'lab', 'settings'];

export type Route =
  | { name: 'signin' }
  | { name: Tab }
  | { name: 'item'; id: string }
  | { name: 'form' | 'gestures' | 'webview' | 'slow' | 'orders' | 'giftcards' };

/** One screen on the back stack. Its key is stable for as long as it stays on the stack. */
export interface Entry {
  key: number;
  route: Route;
}

export interface CartLine {
  itemId: number;
  quantity: number;
}

export interface Order {
  number: number;
  lines: CartLine[];
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Snack {
  id: number;
  /** When it appeared (performance.now()), so a check can time its 10 s. */
  shownAt: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface AppState {
  signedInEmail: string | null;
  cart: CartLine[];
  /** Newest first. */
  orders: Order[];
  /** Settings › Testing: every list load waits 3 s first. */
  slowLoading: boolean;
  /** Settings › Testing: the first load of each visit fails; Try again then succeeds. */
  failFirstLoad: boolean;
  /** Settings › Notifications: post an "order placed" notification when allowed. */
  orderUpdates: boolean;
  themeMode: ThemeMode;
  /** A deep link that arrived before sign-in; opened right after it. */
  pendingItemId: string | null;
  stack: Entry[];
  snack: Snack | null;
  /** What a screen keeps while its entry stays on the stack (the shop's search text). */
  saved: Record<number, Record<string, unknown>>;
}

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 9;

let nextKey = 1;
let nextSnack = 1;

function entry(route: Route): Entry {
  return { key: nextKey++, route };
}

function coldStart(): AppState {
  return {
    signedInEmail: null,
    cart: [],
    orders: [],
    slowLoading: false,
    failFirstLoad: false,
    orderUpdates: false,
    themeMode: 'system',
    pendingItemId: null,
    stack: [entry({ name: 'signin' })],
    snack: null,
    saved: {},
  };
}

/**
 * Everything the app remembers, in memory only. A cold start is always signed out, with an empty cart, no orders and
 * Settings at their defaults, so every run begins from the same screen (SPEC.md §2).
 */
let state: AppState = coldStart();
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

function set(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Back to a cold start. Tests call it between cases. */
export function resetToColdStart(): void {
  state = coldStart();
  listeners.forEach((listener) => listener());
}

/* Navigation. */

export function topRoute(s: AppState = state): Route {
  return s.stack[s.stack.length - 1].route;
}

/** The tab bar shows on a tab's first screen, and only there. */
export function currentTab(s: AppState = state): Tab | null {
  const name = topRoute(s).name;
  return (TABS as readonly string[]).includes(name) ? (name as Tab) : null;
}

function withStack(stack: Entry[]): Partial<AppState> {
  const keys = new Set(stack.map((e) => e.key));
  const saved = Object.fromEntries(Object.entries(state.saved).filter(([key]) => keys.has(Number(key))));
  return { stack, saved };
}

function shopEntry(): Entry {
  const bottom = state.stack[0];
  return bottom.route.name === 'shop' ? bottom : entry({ name: 'shop' });
}

/**
 * A tab always opens at its first screen (SPEC.md §4): the stack keeps the Shop at the bottom and the tab's root above
 * it, and nothing from an earlier visit. So Back from another tab lands on the Shop, as on Android.
 */
export function switchTab(tab: Tab): void {
  const shop = shopEntry();
  set(withStack(tab === 'shop' ? [shop] : [shop, entry({ name: tab })]));
}

export function push(route: Route): void {
  set(withStack([...state.stack, entry(route)]));
}

/** Back: pops one screen. False when there is nothing to pop (the Shop, or sign-in), where Android leaves the app. */
export function back(): boolean {
  if (state.stack.length < 2) return false;
  set(withStack(state.stack.slice(0, -1)));
  return true;
}

/** The top bar's Back on a screen below a tab. */
export function upOrShop(): void {
  if (!back()) switchTab('shop');
}

export function saveFor(key: number, name: string, value: unknown): void {
  set({ saved: { ...state.saved, [key]: { ...state.saved[key], [name]: value } } });
}

/* Sign-in and deep links. */

export function signIn(email: string): void {
  state = { ...state, signedInEmail: email.trim().toLowerCase() };
  const pending = state.pendingItemId;
  const shop = entry({ name: 'shop' });
  set({ pendingItemId: null, ...withStack(pending === null ? [shop] : [shop, entry({ name: 'item', id: pending })]) });
}

/** Sign out returns to the sign-in screen and clears the back stack (SPEC.md §4). */
export function signOut(): void {
  set({ signedInEmail: null, cart: [], orders: [], ...withStack([entry({ name: 'signin' })]) });
}

/**
 * `nthcase-sample://item/{id}` opens the item. Signed out, it waits for sign-in. Back from it lands on the Shop tab,
 * so the item goes on top of the Shop whatever was open before.
 */
export function openDeepLink(id: string): void {
  if (state.signedInEmail === null) {
    set({ pendingItemId: id });
  } else {
    set(withStack([shopEntry(), entry({ name: 'item', id })]));
  }
}

/* Cart and orders. */

/** How many items some lines hold, quantities counted. */
export function itemCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartCount(s: AppState = state): number {
  return itemCount(s.cart);
}

export function lineTotalCents(line: CartLine): number {
  return findItem(line.itemId)!.priceCents * line.quantity;
}

export function totalCents(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
}

function clamp(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, quantity));
}

/** One line per item, in the order items were first added. Adding more caps at 9. */
export function addToCart(itemId: number, quantity: number): void {
  if (!findItem(itemId)) throw new Error(`No item ${itemId}`);
  const existing = state.cart.find((line) => line.itemId === itemId);
  set({
    cart: existing
      ? state.cart.map((line) => (line.itemId === itemId ? { ...line, quantity: clamp(line.quantity + quantity) } : line))
      : [...state.cart, { itemId, quantity: clamp(quantity) }],
  });
}

export function setQuantity(itemId: number, quantity: number): void {
  set({ cart: state.cart.map((line) => (line.itemId === itemId ? { ...line, quantity: clamp(quantity) } : line)) });
}

export function removeLine(itemId: number): void {
  set({ cart: state.cart.filter((line) => line.itemId !== itemId) });
}

/** Moves the cart into a new order, numbered from 1 in each session, newest first. */
export function placeOrder(): Order {
  const order: Order = { number: state.orders.length + 1, lines: state.cart };
  set({ orders: [order, ...state.orders], cart: [] });
  return order;
}

/** Settings › Empty the cart and orders: you stay signed in. */
export function resetData(): void {
  set({ cart: [], orders: [] });
}

/* Settings. */

export function setSetting(patch: Partial<Pick<AppState, 'slowLoading' | 'failFirstLoad' | 'orderUpdates' | 'themeMode'>>): void {
  set(patch);
}

/* The snackbar: one at a time, 10 s each (SPEC.md §5). */

export const SNACK_MS = 10_000;

export function showSnack(message: string, actionLabel?: string, onAction?: () => void): void {
  set({ snack: { id: nextSnack++, shownAt: performance.now(), message, actionLabel, onAction } });
}

export function dismissSnack(id: number): void {
  if (state.snack?.id === id) set({ snack: null });
}
