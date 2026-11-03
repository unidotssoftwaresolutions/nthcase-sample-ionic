import { IonButton, IonContent, IonFooter, IonModal, IonToolbar } from '@ionic/react';
import { useState } from 'react';
import { findItem, formatPrice } from '../data/catalog';
import {
  cartCount,
  getState,
  lineTotalCents,
  placeOrder,
  push,
  removeLine,
  setQuantity,
  showSnack,
  switchTab,
  totalCents,
  useAppState,
  type CartLine,
} from '../data/store';
import { platform } from '../platform';
import { T, tid } from '../testIds';
import { GlyphTile, Icon, ItemNumber, QuantityStepper, Screen, StateMessage, TopBar } from '../ui/parts';
import { useOverlay } from '../ui/overlays';

export function orderPlacedMessage(number: number): string {
  return `Order ${number} placed`;
}

export function itemsWord(count: number): string {
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

export function CartScreen() {
  const { cart } = useAppState();
  // The dialog's text is taken when it opens, so it does not change while the dialog closes over an empty cart.
  const [confirming, setConfirming] = useState<string | null>(null);
  useOverlay(confirming !== null, () => setConfirming(null));

  function place() {
    setConfirming(null);
    const order = placeOrder();
    if (getState().orderUpdates) void platform().postNotification(orderPlacedMessage(order.number), "We're packing it now.");
    showSnack(orderPlacedMessage(order.number), 'View orders', () => push({ name: 'orders' }));
  }

  return (
    <Screen id={T.cartScreen}>
      <TopBar title="Cart" />
      <IonContent>
        {cart.length === 0 ? (
          <StateMessage
            icon="cart"
            title="Your cart is empty"
            body="Open a drawer in the shop and add something."
            actionLabel="Browse the shop"
            onAction={() => switchTab('shop')}
            id={T.cartEmpty}
            actionId={T.cartEmptyAction}
          />
        ) : (
          <div className="mg-cart-lines" {...tid(T.cartList)}>
            {cart.map((line) => (
              <CartLineRow key={line.itemId} line={line} />
            ))}
          </div>
        )}
      </IonContent>
      {cart.length > 0 && (
        <IonFooter className="mg-checkout">
          <IonToolbar>
            <div className="mg-checkout-inner">
              <div className="mg-row">
                <span className="mg-title">Total</span>
                <span className="mg-title-large" {...tid(T.cartTotal)}>
                  {formatPrice(totalCents(cart))}
                </span>
              </div>
              <IonButton {...tid(T.cartCheckout)} color="primary" expand="block" shape="round" className="mg-tall" onClick={() => setConfirming(`${itemsWord(cartCount())} · ${formatPrice(totalCents(getState().cart))}. `)}>
                Check out
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      )}
      <IonModal isOpen={confirming !== null} className="mg-dialog" onDidDismiss={() => setConfirming(null)} aria-labelledby={T.dialogTitle}>
        <div className="mg-dialog-body" {...tid(T.dialog)}>
          <h2 className="mg-headline-small" {...tid(T.dialogTitle)}>
            Place this order?
          </h2>
          <p className="mg-muted" {...tid(T.dialogText)}>
            {confirming}This is a sample shop: nothing is charged or shipped.
          </p>
          <div className="mg-dialog-actions">
            <IonButton {...tid(T.dialogDismiss)} fill="clear" onClick={() => setConfirming(null)}>
              Cancel
            </IonButton>
            <IonButton {...tid(T.dialogConfirm)} fill="clear" onClick={place}>
              Place order
            </IonButton>
          </div>
        </div>
      </IonModal>
    </Screen>
  );
}

function CartLineRow({ line }: { line: CartLine }) {
  const item = findItem(line.itemId)!;
  return (
    <div className="mg-cart-line" {...tid(T.cartLine(item.id))}>
      <div className="mg-row">
        <GlyphTile item={item} size={48} />
        <span className="mg-cart-name">
          <span className="mg-title">{item.name}</span>
          <ItemNumber item={item} />
        </span>
        <span className="mg-title" {...tid(T.cartLineTotal(item.id))}>
          {formatPrice(lineTotalCents(line))}
        </span>
      </div>
      <div className="mg-row">
        <span className="mg-body mg-muted mg-grow">{formatPrice(item.priceCents)} each</span>
        <QuantityStepper
          value={line.quantity}
          onChange={(value) => setQuantity(item.id, value)}
          decreaseId={T.cartLineDecrease(item.id)}
          valueId={T.cartLineQty(item.id)}
          increaseId={T.cartLineIncrease(item.id)}
          subject={item.name}
        />
        <IonButton {...tid(T.cartLineRemove(item.id))} fill="clear" aria-label={`Remove ${item.name}`} onClick={() => removeLine(item.id)}>
          <Icon name="trash" slot="icon-only" />
        </IonButton>
      </div>
    </div>
  );
}
