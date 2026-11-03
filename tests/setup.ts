import '@testing-library/jest-dom/vitest';
import { setupIonicReact } from '@ionic/react';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { resetToColdStart } from '../src/data/store';
import { setPlatform } from '../src/platform';
import { fakePlatform } from './fakePlatform';

// What jsdom does not have and Ionic's components ask for. None of it draws anything.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
class NoObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.ResizeObserver ??= NoObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??= NoObserver as unknown as typeof IntersectionObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
Element.prototype.scrollTo ??= function scrollTo() {};
Element.prototype.setPointerCapture ??= function setPointerCapture() {};

// Material mode, as on Android; no animations, so overlays open and close at once.
setupIonicReact({ mode: 'md', animated: false, hardwareBackButton: false, swipeBackEnabled: false });

beforeEach(() => {
  resetToColdStart();
  fakePlatform.reset();
  setPlatform(fakePlatform);
});

afterEach(() => {
  cleanup();
  document.querySelectorAll('ion-alert, ion-action-sheet, ion-modal').forEach((el) => el.remove());
});
