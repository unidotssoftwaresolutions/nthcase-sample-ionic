import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Mossgrove in Capacitor. The web build (dist/) is copied into both apps by `npx cap sync` and served from inside
 * them: there is no `server.url` and no live reload, so the apps run on their own with no network.
 */
const config: CapacitorConfig = {
  appId: 'com.nthcase.sample',
  appName: 'Mossgrove',
  webDir: 'dist',
  // Web-view inspection (Appium's WEBVIEW context) is left to Capacitor's defaults: on in debug builds, off in release.
  plugins: {
    LocalNotifications: {
      // drawn from art/launcher.svg by scripts/convert-art.mjs
      smallIcon: 'ic_stat_mossgrove',
      iconColor: '#2E5E55',
    },
  },
};

export default config;
