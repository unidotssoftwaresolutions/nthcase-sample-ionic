import type { HTMLAttributes, Ref } from 'react';

// Ionic web components the app uses directly, outside their React wrappers (see App.tsx).
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ion-tab-bar': HTMLAttributes<HTMLIonTabBarElement> & { selectedTab?: string; slot?: string; ref?: Ref<HTMLIonTabBarElement> };
    }
  }
}
