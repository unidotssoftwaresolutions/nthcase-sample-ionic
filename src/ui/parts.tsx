import {
  IonButton,
  IonButtons,
  IonHeader,
  IonInput,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { GLYPHS, ICONS, type IconName } from '../art/art.generated';
import { itemNumber, type Item } from '../data/catalog';
import { getState } from '../data/store';
import { T, tid } from '../testIds';

/** One of the shared interface icons (art/icons), drawn inline in the current text colour. */
export function Icon({ name, size = 24, label, slot }: { name: IconName; size?: number; label?: string; slot?: string }) {
  const art = ICONS[name];
  return (
    <svg
      className="mg-icon"
      slot={slot}
      viewBox={art.viewBox}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={art.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={art.d} />
    </svg>
  );
}

/** The screen's root: an Ionic page that carries the screen's id. */
export function Screen({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div className="ion-page" {...(id ? tid(id) : {})}>
      {children}
    </div>
  );
}

/** The top bar: the screen's title, and Back on screens below a tab. Untagged on the gift-cards screen. */
export function TopBar({ title, onBack, tagged = true }: { title: string; onBack?: () => void; tagged?: boolean }) {
  return (
    <IonHeader>
      <IonToolbar>
        {onBack && (
          <IonButtons slot="start">
            <IonButton {...(tagged ? tid(T.topBarBack) : {})} aria-label="Back" onClick={onBack}>
              <Icon name="back" slot="icon-only" />
            </IonButton>
          </IonButtons>
        )}
        <IonTitle {...(tagged ? tid(T.topBarTitle) : {})} role="heading" aria-level={1}>
          {title}
        </IonTitle>
      </IonToolbar>
    </IonHeader>
  );
}

/** "No. 007" in brass monospace: the item's mark on every screen. */
export function ItemNumber({ item, id }: { item: Item; id?: string }) {
  return (
    <span className="mg-item-number" {...(id ? tid(id) : {})}>
      {itemNumber(item.id)}
    </span>
  );
}

/** The item's drawing on its aisle's tint. */
export function GlyphTile({ item, size, label, id }: { item: Item; size: number; label?: string; id?: string }) {
  const art = GLYPHS[item.glyph];
  return (
    <span
      className={`mg-glyph-tile aisle-${item.category}`}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...(id ? tid(id) : {})}
    >
      <svg
        viewBox={art.viewBox}
        width={size * 0.62}
        height={size * 0.62}
        fill="none"
        stroke="currentColor"
        strokeWidth={art.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={art.d} />
      </svg>
    </span>
  );
}

/** A drawing from art/glyphs by name, for the gift-card designs. */
export function Glyph({ name, size }: { name: keyof typeof GLYPHS; size: number }) {
  const art = GLYPHS[name];
  return (
    <svg viewBox={art.viewBox} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={art.stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={art.d} />
    </svg>
  );
}

/** The label holder of a drawer front: a thin frame around the name and the number. */
export function LabelHolder({ item }: { item: Item }) {
  return (
    <span className="mg-label-holder">
      <span className="mg-title">{item.name}</span>
      <ItemNumber item={item} />
    </span>
  );
}

/** A − value + stepper. At its limit a button is disabled and loses its ring, so the state is a shape too. */
export function QuantityStepper(props: {
  value: number;
  onChange: (value: number) => void;
  decreaseId: string;
  valueId: string;
  increaseId: string;
  subject: string;
}) {
  const { value, onChange, decreaseId, valueId, increaseId, subject } = props;
  const canDecrease = value > 1;
  const canIncrease = value < 9;
  return (
    <span className="mg-stepper">
      <IonButton
        {...tid(decreaseId)}
        className="mg-step"
        fill={canDecrease ? 'outline' : 'clear'}
        disabled={!canDecrease}
        aria-label={`Decrease ${subject}`}
        onClick={() => onChange(value - 1)}
      >
        <Icon name="minus" slot="icon-only" />
      </IonButton>
      <span className="mg-step-value" {...tid(valueId)} aria-label={`Quantity of ${subject}: ${value}`}>
        {value}
      </span>
      <IonButton
        {...tid(increaseId)}
        className="mg-step"
        fill={canIncrease ? 'outline' : 'clear'}
        disabled={!canIncrease}
        aria-label={`Increase ${subject}`}
        onClick={() => onChange(value + 1)}
      >
        <Icon name="plus" slot="icon-only" />
      </IonButton>
    </span>
  );
}

/**
 * A centred message with an icon, a title, a line of help and one action: the shape of every empty and error state.
 * The id sits on the message; the action keeps its own.
 */
export function StateMessage(props: {
  icon: IconName;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  id?: string;
  actionId?: string;
  error?: boolean;
}) {
  const { icon, title, body, actionLabel, onAction, id, actionId, error } = props;
  return (
    <div className="mg-state">
      <div className="mg-state-message" {...(id ? tid(id) : {})} role={error ? 'alert' : undefined}>
        <span className={error ? 'mg-state-icon mg-error-ink' : 'mg-state-icon'}>
          <Icon name={icon} size={40} />
        </span>
        <h2 className="mg-title-large">{title}</h2>
        <p className="mg-muted">{body}</p>
      </div>
      {actionLabel && onAction && (
        <IonButton {...(actionId ? tid(actionId) : {})} fill={error ? 'solid' : 'outline'} shape="round" onClick={onAction}>
          {actionLabel}
        </IonButton>
      )}
    </div>
  );
}

/** A spinner with a line under it, for the slow loads. */
export function Loading({ text, id }: { text: string; id: string }) {
  return (
    <div className="mg-state" {...tid(id)} role="status">
      <IonSpinner name="circular" color="primary" />
      <p className="mg-muted">{text}</p>
    </div>
  );
}

/**
 * A field's error, as a line of its own under the field, with a warning icon (never colour alone). Its id is on the
 * line, outside the field.
 */
export function ErrorLine({ error, id }: { error?: string; id: string }) {
  if (!error) return null;
  return (
    <p className="mg-error-line">
      <Icon name="warning" size={16} />
      <span {...tid(id)}>{error}</span>
    </p>
  );
}

/**
 * IonInput with its id on the native `<input>` inside it, the element a person types into: ion-input renders that
 * input in the light DOM, where `#id` and WebDriver reach it. Ionic names the input itself ("ion-input-3"), so the id
 * is set once the component has drawn it, and its label is pointed at the new id.
 *
 * With `noIds` (the gift-cards screen) Ionic's own generated ids are taken off as well, so the screen has no `id` at
 * all; the label still names the input, because the input sits inside it.
 */
export function Field({ id, noIds, ...props }: ComponentProps<typeof IonInput> & { id?: string; noIds?: boolean }) {
  const ref = useRef<HTMLIonInputElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || (!id && !noIds)) return;
    let live = true;
    void host.getInputElement().then((input) => {
      if (!live) return;
      const ionicId = input.id;
      const label = ionicId ? host.querySelector(`label[for="${ionicId}"]`) : null;
      if (id) {
        input.id = id;
        input.setAttribute('data-testid', id);
        label?.setAttribute('for', id);
      } else {
        input.removeAttribute('id');
        input.removeAttribute('name');
        input.removeAttribute('aria-labelledby');
        label?.removeAttribute('for');
        host.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      }
    });
    return () => {
      live = false;
    };
  }, [id, noIds]);
  return <IonInput ref={ref} {...props} />;
}

/** A load: loading, failed or ready. */
export type LoadStatus = 'loading' | 'failed' | 'ready';

/** How long a slow load takes: inside the spec's 2–5 s, the same on every framework. */
export const SLOW_LOAD_MS = 3000;

/**
 * The local stand-in for a network load (there is no network). It runs each time its screen opens. It waits
 * SLOW_LOAD_MS when `alwaysSlow` or Settings › Slow loading is on, and fails its first attempt when Settings › Fail the
 * first load is on; Try again then succeeds. With both off it is ready at once, so normal runs never see a spinner.
 */
export function useLoad(alwaysSlow = false): { status: LoadStatus; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<LoadStatus>(() => firstStatus(alwaysSlow, 0));
  useEffect(() => {
    const { slowLoading, failFirstLoad } = getState();
    if (!(alwaysSlow || slowLoading)) return;
    const timer = setTimeout(() => setStatus(failFirstLoad && attempt === 0 ? 'failed' : 'ready'), SLOW_LOAD_MS);
    return () => clearTimeout(timer);
  }, [attempt, alwaysSlow]);
  return {
    status,
    retry: () => {
      setStatus(firstStatus(alwaysSlow, attempt + 1));
      setAttempt(attempt + 1);
    },
  };
}

function firstStatus(alwaysSlow: boolean, attempt: number): LoadStatus {
  const { slowLoading, failFirstLoad } = getState();
  if (alwaysSlow || slowLoading) return 'loading';
  return failFirstLoad && attempt === 0 ? 'failed' : 'ready';
}
