import { IonContent, IonItem, IonLabel, IonList } from '@ionic/react';
import { findItem, formatPrice } from '../data/catalog';
import { itemCount, switchTab, totalCents, upOrShop, useAppState } from '../data/store';
import { T, tid } from '../testIds';
import { Loading, Screen, StateMessage, TopBar, useLoad } from '../ui/parts';
import { itemsWord } from './Cart';

/** Order history: the empty state and, with Settings › Fail the first load, the error state with retry. */
export function OrdersScreen() {
  const { orders } = useAppState();
  const load = useLoad();
  return (
    <Screen id={T.ordersScreen}>
      <TopBar title="Orders" onBack={upOrShop} />
      <IonContent>
        {load.status === 'loading' ? (
          <Loading text="Fetching your orders…" id={T.ordersLoading} />
        ) : load.status === 'failed' ? (
          <StateMessage
            icon="warning"
            title="Orders didn't load"
            body="Something went wrong on our side. Try again in a moment."
            actionLabel="Try again"
            onAction={load.retry}
            error
            id={T.ordersError}
            actionId={T.ordersRetry}
          />
        ) : orders.length === 0 ? (
          <StateMessage
            icon="empty"
            title="No orders yet"
            body="Orders you place appear here."
            actionLabel="Start shopping"
            onAction={() => switchTab('shop')}
            id={T.ordersEmpty}
            actionId={T.ordersEmptyAction}
          />
        ) : (
          <IonList {...tid(T.ordersList)} lines="full">
            {orders.map((order) => (
              <IonItem key={order.number} {...tid(T.ordersRow(order.number))}>
                <IonLabel>
                  <h2>Order {order.number}</h2>
                  <p>
                    {itemsWord(itemCount(order.lines))} · {order.lines.map((line) => findItem(line.itemId)!.name).join(', ')}
                  </p>
                </IonLabel>
                <span slot="end" className="mg-title">
                  {formatPrice(totalCents(order.lines))}
                </span>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </Screen>
  );
}
