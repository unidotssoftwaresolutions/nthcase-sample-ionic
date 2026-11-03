import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Motion } from '@capacitor/motion';

/** Whether the system lets the app post notifications: never asked, asked and refused, or allowed. */
export type NotificationPermission = 'prompt' | 'denied' | 'granted';

/**
 * Everything the app asks of the device, in one place: Capacitor's own plugins, nothing else. Tests swap it for a
 * fake with `setPlatform`, so they never touch a real notification centre or sensor.
 */
export interface Platform {
  notificationPermission(): Promise<NotificationPermission>;
  /** Shows the system's notification prompt (the app's one permission prompt). True when allowed. */
  requestNotifications(): Promise<boolean>;
  postNotification(title: string, body: string): Promise<void>;
  /** The deep link the app was opened with, if any. */
  launchUrl(): Promise<string | null>;
  onUrlOpen(handler: (url: string) => void): () => void;
  /** Android's system Back. */
  onBackButton(handler: () => void): () => void;
  exitApp(): void;
  /** Accelerometer readings including gravity, in m/s². */
  onAcceleration(handler: (x: number, y: number, z: number, timestampMs: number) => void): () => void;
  /** iOS lets a web view read motion only after asking; Capacitor answers that question itself, without a prompt. */
  allowMotion(): void;
}

function listen(subscribe: () => Promise<{ remove: () => Promise<void> }>): () => void {
  const handle = subscribe();
  return () => {
    void handle.then((h) => h.remove());
  };
}

let nextNotification = 1;

const capacitor: Platform = {
  async notificationPermission() {
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
  },
  async requestNotifications() {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  },
  async postNotification(title, body) {
    await LocalNotifications.schedule({
      notifications: [{ id: nextNotification++, title, body, smallIcon: 'ic_stat_mossgrove' }],
    });
  },
  async launchUrl() {
    // In a browser there is no app link to open with; `#item/7` on the page's address stands in for it, so the web
    // checks can reach the same screens. The apps load index.html without a hash.
    if (!Capacitor.isNativePlatform()) {
      const match = /^#item\/(.+)$/.exec(location.hash);
      return match ? `nthcase-sample://item/${match[1]}` : null;
    }
    return (await App.getLaunchUrl())?.url ?? null;
  },
  onUrlOpen(handler) {
    if (!Capacitor.isNativePlatform()) return () => {};
    return listen(() => App.addListener('appUrlOpen', (event) => handler(event.url)));
  },
  onBackButton(handler) {
    if (Capacitor.getPlatform() !== 'android') return () => {};
    return listen(() => App.addListener('backButton', () => handler()));
  },
  exitApp() {
    void App.exitApp();
  },
  onAcceleration(handler) {
    return listen(() =>
      Motion.addListener('accel', (event) => {
        const a = event.accelerationIncludingGravity;
        handler(a.x ?? 0, a.y ?? 0, a.z ?? 0, Date.now());
      }),
    );
  },
  allowMotion() {
    const motion = globalThis.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    // Must run inside a tap. WebKit asks Capacitor's web view delegate, which grants it: no system prompt.
    void motion?.requestPermission?.().catch(() => undefined);
  },
};

let current: Platform = capacitor;

export function platform(): Platform {
  return current;
}

export function setPlatform(next: Platform | null): void {
  current = next ?? capacitor;
}
