import { useEffect, useSyncExternalStore } from 'react';
import { useAppState } from '../data/store';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

function subscribeSystem(listener: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/** Whether the app is dark now: Settings › Appearance, or the system when it follows the system. */
export function useDark(): boolean {
  const { themeMode } = useAppState();
  const system = useSyncExternalStore(subscribeSystem, systemDark, () => false);
  return themeMode === 'dark' || (themeMode === 'system' && system);
}

/**
 * Applies the theme to the whole app at once (SPEC.md §5): Ionic's dark palette class on <html>, and the matching
 * color-scheme for native controls and the care guide's frame.
 */
export function useThemeOnDocument(): void {
  const dark = useDark();
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('ion-palette-dark', dark);
    html.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);
}
