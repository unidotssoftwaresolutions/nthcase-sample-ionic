import { IonContent, IonItem, IonLabel, IonList } from '@ionic/react';
import { push, type Route } from '../data/store';
import { platform } from '../platform';
import { T, tid } from '../testIds';
import { Icon, Screen, TopBar } from '../ui/parts';

const BENCHES: { id: string; route: Route; title: string; body: string }[] = [
  { id: T.labForm, route: { name: 'form' }, title: 'Join the club', body: 'A form: text, email, number, password, picker, date, switch, slider, checkbox' },
  { id: T.labGestures, route: { name: 'gestures' }, title: 'Gestures', body: 'Tap, double tap, long press, swipe, drag and drop, pinch, rotate, scroll, shake' },
  { id: T.labWebview, route: { name: 'webview' }, title: 'Care guide', body: 'A web page inside the app, bundled with it' },
  { id: T.labSlow, route: { name: 'slow' }, title: 'Delivery slots', body: 'Loads for 3 seconds, then shows its content' },
  { id: T.labOrders, route: { name: 'orders' }, title: 'Orders', body: 'An empty state, and an error state with retry' },
  { id: T.labGiftCards, route: { name: 'giftcards' }, title: 'Gift cards', body: 'No test ids at all: find things by their text' },
];

/** The Lab: Mossgrove's second cabinet, one drawer per test bench. It says plainly what each one is for. */
export function LabScreen() {
  return (
    <Screen id={T.labScreen}>
      <TopBar title="Lab" />
      <IonContent>
        <p className="mg-body mg-muted mg-intro">Screens for testing. Each one exercises verbs that NthCase records and replays.</p>
        <IonList lines="full">
          {BENCHES.map((bench) => (
            <IonItem
              key={bench.id}
              {...tid(bench.id)}
              button
              detail={false}
              onClick={() => {
                // The tap that opens Gestures also lets its shake detector read motion (iOS asks inside a tap).
                if (bench.route.name === 'gestures') platform().allowMotion();
                push(bench.route);
              }}
            >
              <IonLabel>
                <h2>{bench.title}</h2>
                <p>{bench.body}</p>
              </IonLabel>
              <span slot="end" className="mg-muted">
                <Icon name="chevron" />
              </span>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </Screen>
  );
}
