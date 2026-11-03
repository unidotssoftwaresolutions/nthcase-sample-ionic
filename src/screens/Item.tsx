import { IonButton, IonContent } from '@ionic/react';
import { useState } from 'react';
import { categoryLabel, findItem, formatPrice, ITEMS } from '../data/catalog';
import { addToCart, showSnack, switchTab, upOrShop } from '../data/store';
import { T, tid } from '../testIds';
import { GlyphTile, ItemNumber, QuantityStepper, Screen, StateMessage, TopBar } from '../ui/parts';

export const ADDED_MESSAGE = 'Added to cart';

/** The detail page. `rawId` is the id as written (a deep link's may be unknown or not a number), so it can say so. */
export function ItemScreen({ rawId }: { rawId: string }) {
  const item = /^\d+$/.test(rawId) ? findItem(Number.parseInt(rawId, 10)) : undefined;
  const [quantity, setQuantity] = useState(1);

  return (
    <Screen id={T.itemScreen}>
      <TopBar title={item?.name ?? 'Not found'} onBack={upOrShop} />
      <IonContent>
        {!item ? (
          <StateMessage
            icon="empty"
            title={`No drawer has the number "${rawId}"`}
            body={`Items are numbered 1 to ${ITEMS.length}.`}
            actionLabel="Back to the shop"
            onAction={upOrShop}
            id={T.itemNotFound}
            actionId={T.itemNotFoundAction}
          />
        ) : (
          <div className="mg-detail">
            <GlyphTile item={item} size={220} label={`Drawing of the ${item.name}`} id={T.itemImage} />
            {/* the drawer's label holder, at the scale of the page: the name, then its number */}
            <span className="mg-label-holder mg-label-holder-large">
              <span className="mg-headline-small" {...tid(T.itemName)}>
                {item.name}
              </span>
              <ItemNumber item={item} id={T.itemNumber} />
            </span>
            <p className="mg-title-large" {...tid(T.itemPrice)}>
              {formatPrice(item.priceCents)}
            </p>
            <p className="mg-body-large mg-muted" {...tid(T.itemDescription)}>
              {item.description}
            </p>
            <p className="mg-label mg-muted">{categoryLabel(item.category)} aisle</p>
            <div className="mg-row mg-quantity">
              <span className="mg-title-small">Quantity</span>
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                decreaseId={T.itemQtyDecrease}
                valueId={T.itemQtyValue}
                increaseId={T.itemQtyIncrease}
                subject={item.name}
              />
            </div>
            {/* brass, like the item number and the cart count it fills: the one live action of the page */}
            <IonButton
              {...tid(T.itemAddToCart)}
              color="tertiary"
              expand="block"
              shape="round"
              className="mg-tall"
              onClick={() => {
                addToCart(item.id, quantity);
                showSnack(ADDED_MESSAGE, 'View cart', () => switchTab('cart'));
              }}
            >
              Add to cart · {formatPrice(item.priceCents * quantity)}
            </IonButton>
          </div>
        )}
      </IonContent>
    </Screen>
  );
}
