import { useEffect, type RefObject } from 'react';

/**
 * ion-tab-button names its host "tab-button-<tab>" when it first draws, over any id it was given. Whenever that
 * happens the spec's id (kept in data-testid) goes straight back on; Ionic does not set it again for the same tab.
 * Used by the app's tab bar and by the Lobby's own bar.
 */
export function useTabButtonIds(bar: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const restore = () =>
      el.querySelectorAll('ion-tab-button').forEach((button) => {
        const id = button.getAttribute('data-testid');
        if (id && button.id !== id) button.id = id;
      });
    restore();
    const observer = new MutationObserver(restore);
    observer.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ['id'] });
    return () => observer.disconnect();
  }, [bar]);
}
