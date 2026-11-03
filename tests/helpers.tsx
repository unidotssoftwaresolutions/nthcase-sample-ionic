import { act, fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from 'vitest';
import { App } from '../src/App';
import { TEST_EMAIL } from '../src/data/rules';
import { signIn } from '../src/data/store';

/** A fresh user for each call: a shared one carries focus and pointer state from one test into the next. */
export function user() {
  return userEvent.setup({ delay: null });
}

export function renderApp() {
  return render(<App />);
}

/** The element with this id, once it is there. */
export async function byId<E extends HTMLElement = HTMLElement>(id: string, timeout = 2000): Promise<E> {
  return waitFor(
    () => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`#${id} is not on screen`);
      return el as E;
    },
    { timeout },
  );
}

export async function gone(id: string, timeout = 2000): Promise<void> {
  await waitFor(() => expect(document.getElementById(id), `#${id} should be gone`).toBeNull(), { timeout });
}

export async function tap(id: string): Promise<void> {
  const el = await byId(id);
  await act(async () => {
    fireEvent.click(el);
  });
}

/** Types into the native input that carries the id (it lives inside an ion-input). */
export async function typeInto(id: string, text: string, { replace = false } = {}): Promise<void> {
  const input = await byId<HTMLInputElement>(id);
  const person = user();
  await act(async () => {
    if (replace) await person.clear(input);
    await person.type(input, text);
  });
}

export async function shows(text: string | RegExp, timeout = 2000): Promise<void> {
  await waitFor(() => expect(document.body).toHaveTextContent(text), { timeout });
}

export async function doesNotShow(text: string | RegExp): Promise<void> {
  await waitFor(() => expect(document.body).not.toHaveTextContent(text));
}

export async function text(id: string): Promise<string> {
  return ((await byId(id)).textContent ?? '').trim();
}

/** Scenario step 1, "Open Mossgrove and sign in": the store's sign-in, which is what the sign-in screen calls. */
export async function signedIn(): Promise<void> {
  renderApp();
  await act(async () => signIn(TEST_EMAIL));
  await byId('shop_screen');
}

/** Sets an Ionic control's value the way it reports one: by its own event. */
export async function ionEvent(id: string, name: 'ionInput' | 'ionChange', detail: unknown): Promise<void> {
  const el = await byId(id);
  await act(async () => {
    el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  });
}

export function pause(ms: number): Promise<void> {
  return act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));
}

/** Waits until an Ionic overlay is on screen: its buttons exist a moment before it is presented, and ignore taps. */
export async function presented(tag: 'ion-action-sheet' | 'ion-alert' | 'ion-modal'): Promise<void> {
  await waitFor(() => {
    const overlay = document.querySelector(tag);
    expect(overlay, `${tag} should be presented`).not.toBeNull();
    expect(overlay!.classList.contains('overlay-hidden'), `${tag} should be presented`).toBe(false);
  });
}
