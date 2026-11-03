import { IonButton, IonContent, IonItem, IonLabel, IonList, IonListHeader, IonRadio, IonRadioGroup, IonToggle, useIonAlert } from '@ionic/react';
import { useEffect, useState } from 'react';
import { push, resetData, setSetting, showSnack, signOut, useAppState, type ThemeMode } from '../data/store';
import { platform } from '../platform';
import { T, tid } from '../testIds';
import { registerOverlay } from '../ui/overlays';
import { Screen, TopBar } from '../ui/parts';

export const APP_VERSION = '1.0.0';
export const SPEC_VERSION = '1.0';

export const NOTIFICATIONS_NOT_ALLOWED = 'Not allowed. Turn this on to be asked.';
export const NOTIFICATIONS_OFF = 'Off';
export const NOTIFICATIONS_ON = "On: we'll tell you when an order is placed.";

/**
 * Settings. Ionic has no second UI toolkit, so this screen is built with the same Ionic components as the others
 * (SPEC.md §12; the README says so). It holds the app's one system permission prompt: notifications.
 */
export function SettingsScreen() {
  const app = useAppState();
  const [allowed, setAllowed] = useState(false);
  const [presentAlert, dismissAlert] = useIonAlert();

  useEffect(() => {
    let live = true;
    const read = () =>
      void platform()
        .notificationPermission()
        .then((permission) => {
          if (!live) return;
          const granted = permission === 'granted';
          setAllowed(granted);
          if (!granted) setSetting({ orderUpdates: false });
        });
    read();
    // The person may change the permission in the system's settings and come back.
    const onVisible = () => document.visibilityState === 'visible' && read();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      live = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  async function setOrderUpdates(on: boolean, toggle: HTMLIonToggleElement) {
    if (on && !allowed) {
      toggle.checked = false; // stays off until the system says yes
      const granted = await platform().requestNotifications();
      setAllowed(granted);
      setSetting({ orderUpdates: granted });
      return;
    }
    setSetting({ orderUpdates: on });
  }

  function confirmReset() {
    const unregister = registerOverlay(() => void dismissAlert());
    void presentAlert({
      header: 'Empty the cart and orders?',
      message: "You stay signed in. This can't be undone.",
      // An alert draws its buttons in the light DOM, so its own buttons carry the spec's ids.
      buttons: [
        { text: 'Cancel', role: 'cancel', id: T.settingsResetCancel, htmlAttributes: { 'data-testid': T.settingsResetCancel } },
        {
          text: 'Empty',
          role: 'destructive',
          id: T.settingsResetConfirm,
          htmlAttributes: { 'data-testid': T.settingsResetConfirm },
          handler: () => {
            resetData();
            showSnack('Cart and orders emptied');
          },
        },
      ],
      onDidDismiss: unregister,
    });
  }

  const status = !allowed ? NOTIFICATIONS_NOT_ALLOWED : app.orderUpdates ? NOTIFICATIONS_ON : NOTIFICATIONS_OFF;

  return (
    <Screen id={T.settingsScreen}>
      <TopBar title="Settings" />
      <IonContent>
        <IonList lines="none" className="mg-settings">
          <IonListHeader>
            <IonLabel>Account</IonLabel>
          </IonListHeader>
          <IonItem>
            <IonLabel>
              <span className="mg-body-large" {...tid(T.settingsAccountEmail)}>
                {app.signedInEmail ?? 'Not signed in'}
              </span>
            </IonLabel>
          </IonItem>
          <div className="mg-buttons-row">
            <IonButton {...tid(T.settingsOrders)} fill="outline" shape="round" onClick={() => push({ name: 'orders' })}>
              Order history
            </IonButton>
            <IonButton {...tid(T.settingsSignOut)} shape="round" className="mg-tonal" onClick={signOut}>
              Sign out
            </IonButton>
          </div>

          <IonListHeader>
            <IonLabel>Appearance</IonLabel>
          </IonListHeader>
          <IonRadioGroup
            {...tid(T.settingsTheme)}
            aria-label="Theme"
            value={app.themeMode}
            onIonChange={(event) => setSetting({ themeMode: event.detail.value as ThemeMode })}
          >
            {(
              [
                [T.settingsThemeSystem, 'system', 'Follow the system'],
                [T.settingsThemeLight, 'light', 'Light'],
                [T.settingsThemeDark, 'dark', 'Dark'],
              ] as const
            ).map(([id, value, label]) => (
              <IonItem key={value}>
                <IonRadio {...tid(id)} value={value} labelPlacement="end" justify="start">
                  {label}
                </IonRadio>
              </IonItem>
            ))}
          </IonRadioGroup>

          <IonListHeader>
            <IonLabel>Notifications</IonLabel>
          </IonListHeader>
          <IonItem>
            <IonToggle
              {...tid(T.settingsNotifications)}
              checked={app.orderUpdates}
              onIonChange={(event) => void setOrderUpdates(event.detail.checked, event.target as HTMLIonToggleElement)}
            >
              Order updates
            </IonToggle>
          </IonItem>
          <p className="mg-body mg-muted mg-intro" {...tid(T.settingsNotificationsStatus)} role="status">
            {status}
          </p>
          <div className="mg-buttons-row">
            <IonButton
              {...tid(T.settingsSendNotification)}
              fill="outline"
              shape="round"
              disabled={!(allowed && app.orderUpdates)}
              onClick={() => {
                void platform().postNotification('Your order is packed', 'A test notification from Mossgrove.');
                showSnack('Notification sent');
              }}
            >
              Send a test notification
            </IonButton>
          </div>

          <IonListHeader>
            <IonLabel>Testing</IonLabel>
          </IonListHeader>
          <p className="mg-body mg-muted mg-intro">These change how the shop's lists load. Nothing goes over the network.</p>
          <IonItem>
            <IonToggle {...tid(T.settingsSlowLoading)} checked={app.slowLoading} onIonChange={(event) => setSetting({ slowLoading: event.detail.checked })}>
              Slow loading (3 seconds)
            </IonToggle>
          </IonItem>
          <IonItem>
            <IonToggle {...tid(T.settingsFailLoading)} checked={app.failFirstLoad} onIonChange={(event) => setSetting({ failFirstLoad: event.detail.checked })}>
              Fail the first load
            </IonToggle>
          </IonItem>

          <IonListHeader>
            <IonLabel>Data</IonLabel>
          </IonListHeader>
          <div className="mg-buttons-row">
            <IonButton {...tid(T.settingsReset)} fill="outline" color="danger" shape="round" onClick={confirmReset}>
              Empty the cart and orders
            </IonButton>
          </div>
          <p className="mg-body-small mg-muted mg-intro" {...tid(T.settingsVersion)}>
            Mossgrove {APP_VERSION} · spec {SPEC_VERSION} · a sample app for NthCase
          </p>
        </IonList>
      </IonContent>
    </Screen>
  );
}
