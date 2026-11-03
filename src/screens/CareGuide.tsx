import { useState } from 'react';
import { upOrShop } from '../data/store';
import { T, tid } from '../testIds';
import { Screen, TopBar } from '../ui/parts';
import { useDark } from '../ui/theme';

/** The bundled page (public/care-guide.html), served from inside the app like every other file of it. */
export const CARE_GUIDE_SRC = 'care-guide.html';
export const PAGE_LOADING = 'Loading the care guide…';
export const PAGE_LOADED = 'Care guide loaded';

/**
 * The web view screen: an iframe of the bundled care guide (SPEC.md §12). Its elements keep the page's own `web_*`
 * ids. The page's policy loads nothing remote, and the app's policy (index.html) lets a frame show only the app's own
 * files, so a link leaving the page is refused.
 */
export function CareGuideScreen() {
  const [status, setStatus] = useState(PAGE_LOADING);
  const dark = useDark();
  return (
    <Screen id={T.webviewScreen}>
      <TopBar title="Care guide" onBack={upOrShop} />
      <div className="mg-webview">
        <p className="mg-label mg-muted mg-intro" {...tid(T.webviewStatus)} role="status">
          {status}
        </p>
        <iframe
          {...tid(T.webview)}
          title="Care guide page"
          src={CARE_GUIDE_SRC}
          // The page follows the app's theme: a frame's prefers-color-scheme follows its element's color-scheme.
          style={{ colorScheme: dark ? 'dark' : 'light' }}
          sandbox="allow-scripts allow-forms allow-same-origin"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus(PAGE_LOADED)}
        />
      </div>
    </Screen>
  );
}
