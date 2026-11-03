import { createGesture, getPlatforms, IonApp, IonBadge, IonButton, IonTabButton } from '@ionic/react';
import { defineCustomElement as defineTabBar } from '@ionic/core/components/ion-tab-bar.js';
import { useEffect, useRef } from 'react';
import { deepLinkItemId } from './data/rules';
import {
  back,
  cartCount,
  currentTab,
  dismissSnack,
  getState,
  openDeepLink,
  SNACK_MS,
  switchTab,
  topRoute,
  useAppState,
  type Entry,
  type Tab,
} from './data/store';
import { platform } from './platform';
import { CareGuideScreen } from './screens/CareGuide';
import { CartScreen } from './screens/Cart';
import { FormScreen } from './screens/Form';
import { GesturesScreen } from './screens/Gestures';
import { GiftCardsScreen } from './screens/GiftCards';
import { ItemScreen } from './screens/Item';
import { LabScreen } from './screens/Lab';
import { OrdersScreen } from './screens/Orders';
import { SettingsScreen } from './screens/Settings';
import { ShopScreen } from './screens/Shop';
import { SignInScreen } from './screens/SignIn';
import { SlowScreen } from './screens/Slow';
import { T, tid } from './testIds';
import { closeTopOverlay } from './ui/overlays';
import { Icon } from './ui/parts';
import { useThemeOnDocument } from './ui/theme';

// ion-tab-bar is used as Ionic's web component: its React wrapper needs Ionic's router, and the app keeps its own
// back stack instead (no router package is a dependency).
defineTabBar();

function ScreenFor({ entry }: { entry: Entry }) {
  const route = entry.route;
  switch (route.name) {
    case 'signin':
      return <SignInScreen />;
    case 'shop':
      return <ShopScreen entryKey={entry.key} />;
    case 'cart':
      return <CartScreen />;
    case 'lab':
      return <LabScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'item':
      return <ItemScreen rawId={route.id} />;
    case 'form':
      return <FormScreen />;
    case 'gestures':
      return <GesturesScreen />;
    case 'webview':
      return <CareGuideScreen />;
    case 'slow':
      return <SlowScreen />;
    case 'orders':
      return <OrdersScreen />;
    case 'giftcards':
      return <GiftCardsScreen />;
  }
}

const TAB_BUTTONS: { tab: Tab; label: string; icon: 'shop' | 'cart' | 'lab' | 'settings'; id: string }[] = [
  { tab: 'shop', label: 'Shop', icon: 'shop', id: T.navShop },
  { tab: 'cart', label: 'Cart', icon: 'cart', id: T.navCart },
  { tab: 'lab', label: 'Lab', icon: 'lab', id: T.navLab },
  { tab: 'settings', label: 'Settings', icon: 'settings', id: T.navSettings },
];

/** The bottom bar. The Cart tab says its count: a brass badge, and its own accessible label ("Cart, 2 items"). */
function TabBar({ selected, count }: { selected: Tab; count: number }) {
  const bar = useRef<HTMLIonTabBarElement>(null);
  // ion-tab-button names its host "tab-button-<tab>" when it first draws, over any id it was given. Whenever that
  // happens the spec's id (kept in data-testid) goes straight back on; Ionic does not set it again for the same tab.
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
  }, []);
  // The tab's own label says the count. ion-tab-button copies aria-label to its inner link only when it first draws,
  // so the label is written onto that link here, after every change, once the link exists.
  useEffect(() => {
    let frame = 0;
    let tries = 0;
    const label = () => {
      const buttons = [...(bar.current?.querySelectorAll('ion-tab-button') ?? [])];
      let pending = false;
      for (const button of buttons) {
        const link = button.shadowRoot?.querySelector('a');
        const said = button.getAttribute('data-label');
        // Ionic moves the host's aria-label onto the link; keep it on the host too, where the WEBVIEW context reads it.
        if (said && button.getAttribute('aria-label') !== said) button.setAttribute('aria-label', said);
        if (!link) pending = true;
        else if (said && link.getAttribute('aria-label') !== said) link.setAttribute('aria-label', said);
      }
      if (pending && tries++ < 60) frame = requestAnimationFrame(label);
    };
    label();
    return () => cancelAnimationFrame(frame);
  }, [count, selected]);
  return (
    <ion-tab-bar ref={bar} selectedTab={selected} className="mg-tab-bar">
      {TAB_BUTTONS.map(({ tab, label, icon, id }) => {
        const said = tab === 'cart' && count > 0 ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : label;
        return (
          <IonTabButton key={tab} tab={tab} {...tid(id)} aria-label={said} data-label={said} onClick={() => switchTab(tab)}>
            <Icon name={icon} />
            <span className="mg-tab-label">{label}</span>
            {tab === 'cart' && count > 0 && (
              <IonBadge color="tertiary" aria-hidden>
                {count}
              </IonBadge>
            )}
          </IonTabButton>
        );
      })}
    </ion-tab-bar>
  );
}

/** The snackbar: one message, an optional action, 10 s on screen (SPEC.md §5). Drawn by the app, so its ids are its own. */
function Snackbar({ raised }: { raised: boolean }) {
  const { snack } = useAppState();
  useEffect(() => {
    if (!snack) return;
    const timer = setTimeout(() => dismissSnack(snack.id), SNACK_MS);
    return () => clearTimeout(timer);
  }, [snack]);
  if (!snack) return null;
  return (
    <div
      key={snack.id}
      className={raised ? 'mg-snackbar mg-snackbar-raised' : 'mg-snackbar'}
      {...tid(T.snackbar)}
      role="status"
      aria-live="polite"
      data-shown-at={Math.round(snack.shownAt)}
    >
      <span className="mg-snackbar-text" {...tid(T.snackbarText)}>
        {snack.message}
      </span>
      {snack.actionLabel && (
        <IonButton
          {...tid(T.snackbarAction)}
          fill="clear"
          className="mg-snackbar-action"
          onClick={() => {
            dismissSnack(snack.id);
            snack.onAction?.();
          }}
        >
          {snack.actionLabel}
        </IonButton>
      )}
    </div>
  );
}

/** Android's system Back: closes an open overlay, then goes back a screen, then leaves the app. */
function useSystemBack(): void {
  useEffect(
    () =>
      platform().onBackButton(() => {
        if (closeTopOverlay()) return;
        if (!back()) platform().exitApp();
      }),
    [],
  );
}

/** iOS: a swipe from the left edge goes back, as the top bar's Back does. */
function useEdgeSwipe(host: React.RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const el = host.current;
    if (!el || !getPlatforms().includes('ios')) return;
    const gesture = createGesture({
      el,
      gestureName: 'mossgrove-edge-back',
      threshold: 10,
      canStart: (detail) => detail.startX < 24 && getState().stack.length > 1 && topRoute().name !== 'signin',
      onEnd: (detail) => {
        if (detail.deltaX > el.clientWidth * 0.3 || detail.velocityX > 0.3) back();
      },
    });
    gesture.enable(true);
    return () => gesture.destroy();
  }, [host]);
}

/** `nthcase-sample://item/{id}`: the link the app was opened with, and any that arrive while it runs. */
function useDeepLinks(): void {
  useEffect(() => {
    void platform()
      .launchUrl()
      .then((url) => {
        const id = deepLinkItemId(url);
        if (id !== null) openDeepLink(id);
      });
    return platform().onUrlOpen((url) => {
      const id = deepLinkItemId(url);
      if (id !== null) openDeepLink(id);
    });
  }, []);
}

export function App() {
  const app = useAppState();
  const host = useRef<HTMLDivElement>(null);
  useThemeOnDocument();
  useSystemBack();
  useEdgeSwipe(host);
  useDeepLinks();

  const top = app.stack[app.stack.length - 1];
  const tab = currentTab(app);
  return (
    <IonApp>
      <div className="mg-shell" ref={host}>
        <div className="mg-stage">
          <ScreenFor key={top.key} entry={top} />
        </div>
        {tab && <TabBar selected={tab} count={cartCount(app)} />}
      </div>
      <Snackbar raised={tab !== null} />
    </IonApp>
  );
}

