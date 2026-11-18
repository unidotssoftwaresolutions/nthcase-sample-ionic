import { useEffect } from 'react';
import { back, getState, subscribe } from '../data/store';
import { platform } from '../platform';
import { anOverlayIsOpen, closeTopOverlay, watchOverlays } from './overlays';

/**
 * The address the app's one history entry carries: `#back-1`, `#back-2`, … A new number each time the entry is put
 * back, so every Back changes the page's address, which is how a browser driver (NthCase's included) tells a Back
 * that went somewhere from one that did nothing.
 */
let entries = 0;
const mark = () => `#back-${++entries}`;

/**
 * In a plain browser (the GitHub Pages build), the browser's Back does what Android's system Back does: it closes an
 * open overlay or panel, then goes back a screen. The app keeps its own back stack in memory, so it keeps exactly one
 * history entry of its own, its address ending in `#back-<n>`, whenever there is something to go back to. Back pops
 * that entry; the app then goes back one step and puts the entry back if there is still somewhere to go. With nothing
 * to go back to there is no entry of the app's, and the browser's Back leaves the app as it would leave any page.
 *
 * The apps never do this: Capacitor's web view has no address bar, and Android's Back reaches the app through
 * `@capacitor/app` (App.tsx).
 */
export function useBrowserBack(): void {
  useEffect(() => {
    if (!platform().usesBrowserHistory()) return;
    let ours = history.state?.mossgrove === 'back';
    let leaving = 0;

    const canGoBack = () => anOverlayIsOpen() || getState().stack.length > 1;
    const sync = () => {
      if (leaving > 0) return;
      if (canGoBack() && !ours) {
        history.pushState({ mossgrove: 'back' }, '', mark());
        ours = true;
      } else if (!canGoBack() && ours) {
        // gone back inside the app (its own Back button): take the app's entry off as well
        ours = false;
        leaving += 1;
        history.back();
      }
    };
    const onPop = () => {
      if (leaving > 0) {
        leaving -= 1;
        sync();
        return;
      }
      ours = history.state?.mossgrove === 'back';
      if (!closeTopOverlay()) back();
      sync();
    };

    window.addEventListener('popstate', onPop);
    const stopStore = subscribe(sync);
    const stopOverlays = watchOverlays(sync);
    sync();
    return () => {
      window.removeEventListener('popstate', onPop);
      stopStore();
      stopOverlays();
    };
  }, []);
}
