import { useEffect, useRef } from 'react';

/**
 * The overlays open right now (dialogs, the date picker, the aisle sheet), newest last. Android's system Back closes
 * the newest one before it leaves a screen, as a native dialog does.
 */
const open: (() => void)[] = [];
const watchers = new Set<() => void>();

function changed(): void {
  watchers.forEach((watcher) => watcher());
}

export function registerOverlay(close: () => void): () => void {
  open.push(close);
  changed();
  return () => {
    const index = open.lastIndexOf(close);
    if (index >= 0) open.splice(index, 1);
    changed();
  };
}

/** Whether an overlay is open now: then Back closes it rather than leaving the screen. */
export function anOverlayIsOpen(): boolean {
  return open.length > 0;
}

/** Called whenever an overlay opens or closes. */
export function watchOverlays(watcher: () => void): () => void {
  watchers.add(watcher);
  return () => watchers.delete(watcher);
}

/** Closes the newest overlay. False when none is open. */
export function closeTopOverlay(): boolean {
  const close = open[open.length - 1];
  if (!close) return false;
  close();
  return true;
}

/** Registers an inline overlay while `isOpen`. */
export function useOverlay(isOpen: boolean, close: () => void): void {
  const latest = useRef(close);
  useEffect(() => {
    latest.current = close;
  });
  useEffect(() => {
    if (!isOpen) return;
    return registerOverlay(() => latest.current());
  }, [isOpen]);
}
