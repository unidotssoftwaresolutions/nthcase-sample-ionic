import { IonButton, IonContent, IonItem, IonLabel, IonList } from '@ionic/react';
import { useState } from 'react';
import { DELIVERY_SLOTS } from '../data/catalog';
import { upOrShop } from '../data/store';
import { T, tid } from '../testIds';
import { Loading, Screen, StateMessage, TopBar, useLoad } from '../ui/parts';

/** Always slow: a 3 s spinner, then the slots. Reload starts the wait again. */
export function SlowScreen() {
  const [round, setRound] = useState(0);
  return (
    <Screen id={T.slowScreen}>
      <TopBar title="Delivery slots" onBack={upOrShop} />
      <IonContent>
        <Slots key={round} onReload={() => setRound(round + 1)} />
      </IonContent>
    </Screen>
  );
}

function Slots({ onReload }: { onReload: () => void }) {
  const load = useLoad(true);
  if (load.status === 'loading') return <Loading text="Finding delivery slots…" id={T.slowLoading} />;
  if (load.status === 'failed') {
    return <StateMessage icon="warning" title="Slots didn't load" body="Something went wrong on our side." actionLabel="Try again" onAction={load.retry} error />;
  }
  return (
    <div {...tid(T.slowContent)}>
      <p className="mg-body mg-muted mg-intro">Choose when we bring your order.</p>
      <IonList lines="none">
        {DELIVERY_SLOTS.map((slot, index) => (
          <IonItem key={slot} {...tid(T.slowSlot(index + 1))}>
            <IonLabel>{slot}</IonLabel>
          </IonItem>
        ))}
      </IonList>
      <div className="mg-padded">
        <IonButton {...tid(T.slowReload)} fill="outline" expand="block" shape="round" onClick={onReload}>
          Reload
        </IonButton>
      </div>
    </div>
  );
}
