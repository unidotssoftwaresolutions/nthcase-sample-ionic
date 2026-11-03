import { useEffect, useRef } from 'react';

/**
 * The overlays open right now (dialogs, the date picker, the aisle sheet), newest last. Android's system Back closes
 * the newest one before it leaves a screen, as a native dialog does.
 */
const open: (() => void)[] = [];

export function registerOverlay(close: () => void): () => void {
  open.push(close);
  return () => {
    const index = open.lastIndexOf(close);
    if (index >= 0) open.splice(index, 1);
  };
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
