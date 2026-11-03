import { IonButton, IonContent, IonHeader, IonItem, IonList, IonRefresher, IonRefresherContent, IonToolbar } from '@ionic/react';
import { useMemo } from 'react';
import { formatPrice, ITEMS, itemNumber, search, type Item } from '../data/catalog';
import { getState, push, saveFor, showSnack, useAppState } from '../data/store';
import { T, tid } from '../testIds';
import { Field, GlyphTile, Icon, LabelHolder, Loading, Screen, SLOW_LOAD_MS, StateMessage, useLoad } from '../ui/parts';

/** How long a pull-to-refresh spins when loading is not slowed. */
export const REFRESH_MS = 800;
export const REFRESHED_MESSAGE = 'Catalogue is up to date';

export function ShopScreen({ entryKey }: { entryKey: number }) {
  const app = useAppState();
  // The search text stays while the Shop is on the stack: back from an item, or back from another tab.
  const query = String(app.saved[entryKey]?.query ?? '');
  const setQuery = (value: string) => saveFor(entryKey, 'query', value);
  const load = useLoad();
  const results = useMemo(() => search(query), [query]);

  return (
    <Screen id={T.shopScreen}>
      <IonHeader className="ion-no-border">
        <IonToolbar className="mg-shop-head">
          <h1 className="mg-headline">Mossgrove</h1>
          <Field
            id={T.shopSearch}
            aria-label="Search"
            placeholder="Search by name or number"
            fill="outline"
            type="search"
            enterkeyhint="search"
            className="mg-search"
            value={query}
            onIonInput={(event) => setQuery(String(event.detail.value ?? ''))}
          >
            <span slot="start" className="mg-muted">
              <Icon name="search" />
            </span>
            {query !== '' && (
              <IonButton slot="end" fill="clear" {...tid(T.shopSearchClear)} aria-label="Clear search" onClick={() => setQuery('')}>
                <Icon name="close" slot="icon-only" />
              </IonButton>
            )}
          </Field>
          {load.status === 'ready' && (
            <p className="mg-label mg-muted mg-count" {...tid(T.shopCount)}>
              {query.trim() === '' ? `${ITEMS.length} drawers · No. 001–040` : `${results.length} of ${ITEMS.length} drawers`}
            </p>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {load.status === 'loading' && <Loading text="Opening the drawers…" id={T.shopLoading} />}
        {load.status === 'failed' && (
          <StateMessage
            icon="warning"
            title="The catalogue didn't load"
            body="Something went wrong on our side. Your cart is safe."
            actionLabel="Try again"
            onAction={load.retry}
            error
            id={T.shopError}
            actionId={T.shopRetry}
          />
        )}
        {load.status === 'ready' && (
          <>
            <IonRefresher
              slot="fixed"
              onIonRefresh={(event) => {
                setTimeout(() => {
                  void event.detail.complete();
                  showSnack(REFRESHED_MESSAGE);
                }, getState().slowLoading ? SLOW_LOAD_MS : REFRESH_MS);
              }}
            >
              <IonRefresherContent />
            </IonRefresher>
            {results.length === 0 ? (
              <StateMessage
                icon="empty"
                title={`No drawers match "${query.trim()}"`}
                body="Try a shorter word, or an item number like 7."
                actionLabel="Clear search"
                onAction={() => setQuery('')}
                id={T.shopEmpty}
                actionId={T.shopEmptyAction}
              />
            ) : (
              <IonList {...tid(T.shopList)} className="mg-drawers" lines="none">
                {results.map((item) => (
                  <DrawerRow key={item.id} item={item} />
                ))}
              </IonList>
            )}
          </>
        )}
      </IonContent>
    </Screen>
  );
}

/** One drawer front: the glyph tile, the label holder, the price. One tappable element that reads all three. */
function DrawerRow({ item }: { item: Item }) {
  return (
    <IonItem
      {...tid(T.shopItem(item.id))}
      button
      detail={false}
      className="mg-drawer"
      aria-label={`${item.name}, ${itemNumber(item.id)}, ${formatPrice(item.priceCents)}`}
      onClick={() => push({ name: 'item', id: String(item.id) })}
    >
      <GlyphTile item={item} size={56} />
      <span className="mg-drawer-label">
        <LabelHolder item={item} />
      </span>
      <span className="mg-title" slot="end">
        {formatPrice(item.priceCents)}
      </span>
    </IonItem>
  );
}
