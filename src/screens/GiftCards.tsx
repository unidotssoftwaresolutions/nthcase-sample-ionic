import { IonButton, IonCard, IonCardContent, IonChip, IonContent, IonLabel } from '@ionic/react';
import { useState } from 'react';
import { GIFT_CARD_CODE } from '../data/rules';
import { upOrShop } from '../data/store';
import { Field, Glyph, Icon, Screen, TopBar } from '../ui/parts';

export const GIFT_CARD_BALANCE = 'Balance: $25.00';
export const GIFT_CARD_UNKNOWN = "We don't recognise that code";

type Design = 'Fern' | 'Stone';

/**
 * The screen with no test ids at all (SPEC.md §5). Nothing here carries an id or a data-testid, its top bar included,
 * so NthCase must find each control by its text, its label and its position. Two buttons share the text "Choose":
 * only their position tells them apart.
 */
export function GiftCardsScreen() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [amount, setAmount] = useState(25);
  const [design, setDesign] = useState<Design | null>(null);

  return (
    <Screen>
      <TopBar title="Gift cards" onBack={upOrShop} tagged={false} />
      <IonContent>
        <div className="mg-column">
          <h2 className="mg-title">Check a balance</h2>
          <Field
            noIds
            label="Card code"
            labelPlacement="floating"
            fill="outline"
            autocapitalize="characters"
            value={code}
            onIonInput={(event) => {
              setCode(String(event.detail.value ?? '').toUpperCase());
              setResult(null);
            }}
          />
          <IonButton expand="block" shape="round" className="mg-tall" onClick={() => setResult(code.trim() === GIFT_CARD_CODE ? GIFT_CARD_BALANCE : GIFT_CARD_UNKNOWN)}>
            Check balance
          </IonButton>
          {result && (
            <p className="mg-title" role="status">
              {result}
            </p>
          )}

          <h2 className="mg-title mg-section">Buy a card</h2>
          <div className="mg-chips">
            {[10, 25, 50].map((value) => (
              <IonChip key={value} outline={amount !== value} className={amount === value ? 'mg-chip-selected' : undefined} aria-pressed={amount === value} onClick={() => setAmount(value)}>
                {/* selected is a mark as well as a tint */}
                {amount === value && <Icon name="check" size={18} />}
                <IonLabel>${value}</IonLabel>
              </IonChip>
            ))}
          </div>
          <div className="mg-designs">
            <DesignCard title="Fern" body="Green leaves" chosen={design === 'Fern'} onChoose={() => setDesign('Fern')} />
            <DesignCard title="Stone" body="Grey pebbles" chosen={design === 'Stone'} onChoose={() => setDesign('Stone')} />
          </div>
          <p className="mg-body-large">{design ? `A $${amount} card with the ${design} design` : 'Choose a design'}</p>
        </div>
      </IonContent>
    </Screen>
  );
}

/** A gift-card design: a picture of it, its name, and Choose. The chosen one has a check and a primary border. */
function DesignCard({ title, body, chosen, onChoose }: { title: Design; body: string; chosen: boolean; onChoose: () => void }) {
  return (
    <IonCard className={chosen ? 'mg-design mg-design-chosen' : 'mg-design'}>
      <IonCardContent>
        <span className={`mg-design-art aisle-${title === 'Fern' ? 'garden' : 'home'}`}>
          {title === 'Fern' ? (
            <Glyph name="plant" size={44} />
          ) : (
            // three pebbles, drawn for this card
            <svg width="64" height="36" viewBox="0 0 64 36" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <ellipse cx="13.4" cy="23.4" rx="13.4" ry="10.8" />
              <ellipse cx="34" cy="9" rx="10.9" ry="9" />
              <ellipse cx="49.9" cy="25.6" rx="14.1" ry="9.4" />
            </svg>
          )}
        </span>
        <span className="mg-row">
          <span className="mg-title-small mg-grow">{title}</span>
          {chosen && (
            <span className="mg-primary-ink">
              <Icon name="check" size={18} label="Chosen" />
            </span>
          )}
        </span>
        <span className="mg-body-small mg-muted">{body}</span>
        <IonButton fill="outline" expand="block" shape="round" onClick={onChoose}>
          Choose
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
}
