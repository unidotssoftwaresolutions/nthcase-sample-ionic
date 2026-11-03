import { setupIonicReact } from '@ionic/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import './theme/variables.css';
import './theme/app.css';

// The mode follows the platform: iOS styling on iOS, Material on Android (and in a desktop browser). Android's system
// Back is handled by the app (App.tsx), so Ionic's own handler is off.
setupIonicReact({ hardwareBackButton: false, swipeBackEnabled: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
