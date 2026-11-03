import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { showSnack, SNACK_MS } from '../src/data/store';
import { SLOW_LOAD_MS } from '../src/ui/parts';
import { signedIn } from './helpers';

describe('timings (SPEC.md §2)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps a snackbar on screen for 10 s, then takes it away', async () => {
    await signedIn();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await act(async () => showSnack('Added to cart', 'View cart', () => {}));
    // (waitFor polls with setTimeout, which is faked here: read the DOM directly)
    expect(document.getElementById('snackbar_action')?.textContent).toBe('View cart');
    expect(SNACK_MS).toBe(10_000);
    await act(async () => {
      vi.advanceTimersByTime(9_900);
    });
    expect(document.getElementById('snackbar_text')?.textContent).toBe('Added to cart');
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(document.getElementById('snackbar')).toBeNull();
  });

  it('replaces a snackbar with the next one, which gets its own 10 s', async () => {
    await signedIn();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await act(async () => showSnack('Added to cart'));
    await act(async () => {
      vi.advanceTimersByTime(6_000);
    });
    await act(async () => showSnack('Order 1 placed'));
    await act(async () => {
      vi.advanceTimersByTime(6_000);
    });
    expect(document.getElementById('snackbar_text')?.textContent).toBe('Order 1 placed');
    await act(async () => {
      vi.advanceTimersByTime(4_100);
    });
    expect(document.getElementById('snackbar')).toBeNull();
  });

  it('makes the slow loads 3 s', () => {
    expect(SLOW_LOAD_MS).toBe(3_000);
  });
});
