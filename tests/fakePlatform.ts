import type { NotificationPermission, Platform } from '../src/platform';

/** A device for the tests: a notification centre that answers as told, and hands to press Back, open links and shake. */
class FakePlatform implements Platform {
  permission: NotificationPermission = 'prompt';
  /** What the system prompt answers. */
  answer = true;
  prompts = 0;
  posted: { title: string; body: string }[] = [];
  launch: string | null = null;
  exited = 0;
  private urlHandler: ((url: string) => void) | null = null;
  private backHandler: (() => void) | null = null;
  private accelHandler: ((x: number, y: number, z: number, t: number) => void) | null = null;

  reset() {
    this.permission = 'prompt';
    this.answer = true;
    this.prompts = 0;
    this.posted = [];
    this.launch = null;
    this.exited = 0;
    this.urlHandler = this.backHandler = this.accelHandler = null;
  }

  async notificationPermission() {
    return this.permission;
  }
  async requestNotifications() {
    this.prompts += 1;
    this.permission = this.answer ? 'granted' : 'denied';
    return this.answer;
  }
  async postNotification(title: string, body: string) {
    this.posted.push({ title, body });
  }
  async launchUrl() {
    return this.launch;
  }
  onUrlOpen(handler: (url: string) => void) {
    this.urlHandler = handler;
    return () => (this.urlHandler = null);
  }
  onBackButton(handler: () => void) {
    this.backHandler = handler;
    return () => (this.backHandler = null);
  }
  exitApp() {
    this.exited += 1;
  }
  onAcceleration(handler: (x: number, y: number, z: number, t: number) => void) {
    this.accelHandler = handler;
    return () => (this.accelHandler = null);
  }
  allowMotion() {}

  /* What a test does to the device. */
  pressBack() {
    this.backHandler?.();
  }
  openUrl(url: string) {
    this.urlHandler?.(url);
  }
  shake() {
    const g = 9.80665 * 3;
    [0, 200, 400].forEach((t) => this.accelHandler?.(g, 0, 0, 1000 + t));
  }
}

export const fakePlatform = new FakePlatform();
