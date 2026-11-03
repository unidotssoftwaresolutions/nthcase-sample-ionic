import { IonButton, IonContent, IonHeader, IonToolbar } from '@ionic/react';
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ShakeDetector, swipeDirection } from '../data/rules';
import { upOrShop } from '../data/store';
import { platform } from '../platform';
import { T, tid } from '../testIds';
import { Icon, Screen, TopBar } from '../ui/parts';

/** The status words of the gestures screen. They are the spec's oracle: the same words on every framework. */
export const GESTURE_WORDS = {
  ready: 'Ready',
  tapped: 'Tapped',
  doubleTapped: 'Double-tapped',
  longPressed: 'Long-pressed',
  swiped: (direction: string) => `Swiped ${direction}`,
  dropped: 'Dropped on the drawer',
  dropMissed: 'Dropped outside the drawer',
  pinchedOut: 'Pinched out',
  pinchedIn: 'Pinched in',
  rotatedCw: 'Rotated clockwise',
  rotatedCcw: 'Rotated counter-clockwise',
  scrolledTo: 'Found the bottom drawer',
  shaken: 'Shaken',
} as const;

/** Two taps this close in time and place make a double tap. */
export const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 40;
/** A long press is a touch held this long without moving. */
export const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP = 10;
/** A swipe travels at least 48 dp (CSS px are dp in a web view). */
const SWIPE_MIN = 48;

const LANDSCAPE = '(orientation: landscape)';

function useLandscape(): boolean {
  return useSyncExternalStore(
    (listener) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const query = window.matchMedia(LANDSCAPE);
      query.addEventListener('change', listener);
      return () => query.removeEventListener('change', listener);
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(LANDSCAPE).matches,
    () => false,
  );
}

/**
 * A click with `detail` 0 did not come from a pointer: a keyboard or a screen reader activated the pad. Each pad then
 * performs its own gesture, which is how the double-tap, long-press and drag pads offer their gesture to assistive
 * technology (SPEC.md §5).
 */
function fromAssistiveTech(event: { detail: number }): boolean {
  return event.detail === 0;
}

export function GesturesScreen() {
  const [status, setStatus] = useState<string>(GESTURE_WORDS.ready);
  const [taps, setTaps] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const landscape = useLandscape();

  useEffect(() => {
    const detector = new ShakeDetector(() => setStatus(GESTURE_WORDS.shaken));
    return platform().onAcceleration((x, y, z, t) => detector.onReading(x, y, z, t));
  }, []);

  return (
    <Screen id={T.gesturesScreen}>
      <TopBar title="Gestures" onBack={upOrShop} />
      {/* Pinned above the scrolling benches, so the status is on screen after any gesture. */}
      <IonHeader className="ion-no-border mg-status-strip">
        <IonToolbar>
          <div className="mg-row">
            <span className="mg-title mg-grow" {...tid(T.gesturesStatus)} role="status" aria-live="polite">
              {status}
            </span>
            <span className="mg-label" {...tid(T.gesturesOrientation)}>
              {landscape ? 'Landscape' : 'Portrait'}
            </span>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent {...tid(T.gesturesScroll)} onPointerDown={() => platform().allowMotion()}>
        <div className="mg-column mg-benches">
          <div className="mg-pads">
            <button
              type="button"
              className="mg-pad"
              {...tid(T.gesturesTap)}
              onClick={() => {
                setTaps((n) => n + 1);
                setStatus(GESTURE_WORDS.tapped);
              }}
            >
              <span className="mg-title-small">Tap</span>
              <span className="mg-body-small mg-muted" {...tid(T.gesturesTapCount)}>
                Taps: {taps}
              </span>
            </button>
            <DoubleTapPad onDoubleTap={() => setStatus(GESTURE_WORDS.doubleTapped)} />
            <LongPressPad onLongPress={() => setStatus(GESTURE_WORDS.longPressed)} />
          </div>

          <SwipePad onSwipe={(direction) => setStatus(GESTURE_WORDS.swiped(direction))} />

          <DragAndDrop onDrop={(hit) => setStatus(hit ? GESTURE_WORDS.dropped : GESTURE_WORDS.dropMissed)} />

          <div className="mg-pads">
            <TwoFingerPad
              title="Pinch"
              id={T.gesturesPinch}
              value={`Zoom ${zoom.toFixed(1)}×`}
              valueId={T.gesturesZoomValue}
              swatch={{ transform: `scale(${zoom})` }}
              onGestureEnd={(z) => {
                if (z > 1.05 || z < 0.95) {
                  setZoom((current) => Math.min(3, Math.max(0.5, current * z)));
                  setStatus(z > 1 ? GESTURE_WORDS.pinchedOut : GESTURE_WORDS.pinchedIn);
                }
              }}
            />
            <TwoFingerPad
              title="Rotate"
              id={T.gesturesRotate}
              value={`Rotation ${Math.round(rotation)}°`}
              valueId={T.gesturesRotationValue}
              swatch={{ transform: `rotate(${rotation}deg)` }}
              onGestureEnd={(_, r) => {
                if (Math.abs(r) > 10) {
                  setRotation((current) => (current + r) % 360);
                  setStatus(r > 0 ? GESTURE_WORDS.rotatedCw : GESTURE_WORDS.rotatedCcw);
                }
              }}
            />
          </div>

          <p className="mg-body mg-muted">Scroll to the bottom drawer. It is below the shelves.</p>
          {Array.from({ length: 12 }, (_, shelf) => (
            <div key={shelf} className="mg-shelf mg-muted">
              Shelf {shelf + 1}
            </div>
          ))}
          <IonButton {...tid(T.gesturesScrollTarget)} expand="block" shape="round" className="mg-tall" onClick={() => setStatus(GESTURE_WORDS.scrolledTo)}>
            Open the bottom drawer
          </IonButton>
        </div>
      </IonContent>
    </Screen>
  );
}

function Pad({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) {
  return (
    <>
      <span className="mg-title-small">{title}</span>
      <span className="mg-body-small mg-muted">{hint}</span>
      {children}
    </>
  );
}

function DoubleTapPad({ onDoubleTap }: { onDoubleTap: () => void }) {
  const last = useRef<{ t: number; x: number; y: number } | null>(null);
  return (
    <button
      type="button"
      className="mg-pad"
      {...tid(T.gesturesDoubleTap)}
      aria-label="Double tap"
      onPointerUp={(event) => {
        const now = event.timeStamp;
        const prev = last.current;
        if (prev && now - prev.t <= DOUBLE_TAP_MS && Math.hypot(event.clientX - prev.x, event.clientY - prev.y) <= DOUBLE_TAP_SLOP) {
          last.current = null;
          onDoubleTap();
        } else {
          last.current = { t: now, x: event.clientX, y: event.clientY };
        }
      }}
      onClick={(event) => {
        if (fromAssistiveTech(event)) onDoubleTap();
      }}
    >
      <Pad title="Double tap" hint="Twice, quickly" />
    </button>
  );
}

function LongPressPad({ onLongPress }: { onLongPress: () => void }) {
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  const cancel = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };
  useEffect(() => cancel, []);
  return (
    <button
      type="button"
      className="mg-pad"
      {...tid(T.gesturesLongPress)}
      aria-label="Long press"
      onPointerDown={(event) => {
        cancel();
        press.current = { x: event.clientX, y: event.clientY, timer: setTimeout(() => ((press.current = null), onLongPress()), LONG_PRESS_MS) };
      }}
      onPointerMove={(event) => {
        if (press.current && Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > LONG_PRESS_SLOP) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        if (fromAssistiveTech(event)) onLongPress();
      }}
    >
      <Pad title="Long press" hint="Hold for a moment" />
    </button>
  );
}

function SwipePad({ onSwipe }: { onSwipe: (direction: string) => void }) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const keys: Record<string, string> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  return (
    <div
      className="mg-pad mg-swipe"
      {...tid(T.gesturesSwipe)}
      role="application"
      aria-label="Swipe pad"
      aria-roledescription="swipe pad"
      aria-description="Swipe left, right, up or down. With a keyboard, the arrow keys swipe."
      tabIndex={0}
      onPointerDown={(event) => {
        start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerUp={(event) => {
        const s = start.current;
        start.current = null;
        if (!s || s.id !== event.pointerId) return;
        const direction = swipeDirection(event.clientX - s.x, event.clientY - s.y, SWIPE_MIN);
        if (direction) onSwipe(direction);
      }}
      onPointerCancel={() => (start.current = null)}
      onKeyDown={(event) => {
        const direction = keys[event.key];
        if (direction) {
          event.preventDefault();
          onSwipe(direction);
        }
      }}
    >
      <span className="mg-title-small">Swipe</span>
      <span className="mg-body-small mg-muted">Left, right, up or down</span>
    </div>
  );
}

function DragAndDrop({ onDrop }: { onDrop: (hit: boolean) => void }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dropped, setDropped] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; source: DOMRect } | null>(null);
  const target = useRef<HTMLDivElement>(null);

  const finish = (hit: boolean) => {
    if (hit) setDropped(true);
    onDrop(hit);
  };

  return (
    <div className="mg-drag">
      <span className="mg-title-small">Drag the label onto the drawer</span>
      <div className="mg-drag-row">
        <button
          type="button"
          className="mg-drag-label mg-mono"
          {...tid(T.gesturesDragSource)}
          aria-label="Label No. 007"
          aria-description="Drag it onto the drawer. With a keyboard or screen reader, activate it to drop it on the drawer."
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
          onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
            drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, source: event.currentTarget.getBoundingClientRect() };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            const d = drag.current;
            if (d && d.id === event.pointerId) setOffset({ x: event.clientX - d.x, y: event.clientY - d.y });
          }}
          onPointerUp={(event) => {
            const d = drag.current;
            drag.current = null;
            setOffset({ x: 0, y: 0 });
            if (!d || d.id !== event.pointerId) return;
            const dx = event.clientX - d.x;
            const dy = event.clientY - d.y;
            if (Math.hypot(dx, dy) < 4) return; // a tap, not a drag
            const centre = { x: d.source.left + d.source.width / 2 + dx, y: d.source.top + d.source.height / 2 + dy };
            const box = target.current!.getBoundingClientRect();
            finish(centre.x >= box.left && centre.x <= box.right && centre.y >= box.top && centre.y <= box.bottom);
          }}
          onPointerCancel={() => {
            drag.current = null;
            setOffset({ x: 0, y: 0 });
          }}
          onClick={(event) => {
            if (fromAssistiveTech(event)) finish(true);
          }}
        >
          No. 007
        </button>
        <div ref={target} className={dropped ? 'mg-drop mg-drop-done' : 'mg-drop'} {...tid(T.gesturesDropTarget)} role="img" aria-label={dropped ? 'Drawer, labelled' : 'Drawer, no label'}>
          {dropped && <Icon name="check" size={18} />}
          <span>{dropped ? 'Labelled' : 'Drawer'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * A pad that reads a two-finger gesture from first touch to last lift, then reports its total zoom and rotation
 * (degrees, clockwise positive) once.
 */
function TwoFingerPad(props: {
  title: string;
  id: string;
  value: string;
  valueId: string;
  swatch: { transform: string };
  onGestureEnd: (zoom: number, rotation: number) => void;
}) {
  const { title, id, value, valueId, swatch, onGestureEnd } = props;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ d0: number; a0: number; zoom: number; rotation: number; ids: [number, number] } | null>(null);

  const measure = () => {
    const g = gesture.current;
    if (!g) return;
    const a = pointers.current.get(g.ids[0]);
    const b = pointers.current.get(g.ids[1]);
    if (!a || !b) return;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    let turn = angle - g.a0;
    if (turn > 180) turn -= 360;
    if (turn < -180) turn += 360;
    g.zoom = g.d0 > 0 ? d / g.d0 : 1;
    g.rotation = turn;
  };

  return (
    <div
      className="mg-pad mg-two-finger"
      {...tid(id)}
      role="img"
      aria-label={`${title} pad`}
      onPointerDown={(event) => {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        event.currentTarget.setPointerCapture?.(event.pointerId);
        if (!gesture.current && pointers.current.size === 2) {
          const [[ia, a], [ib, b]] = [...pointers.current.entries()];
          gesture.current = {
            d0: Math.hypot(b.x - a.x, b.y - a.y),
            a0: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
            zoom: 1,
            rotation: 0,
            ids: [ia, ib],
          };
        }
      }}
      onPointerMove={(event) => {
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        measure();
      }}
      onPointerUp={(event) => {
        if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        measure();
        pointers.current.delete(event.pointerId);
        if (pointers.current.size === 0 && gesture.current) {
          const { zoom, rotation } = gesture.current;
          gesture.current = null;
          onGestureEnd(zoom, rotation);
        }
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size === 0) gesture.current = null;
      }}
    >
      <span className="mg-title-small">{title}</span>
      <span className="mg-swatch" style={swatch} aria-hidden />
      <span className="mg-body-small mg-pad-value" {...tid(valueId)}>
        {value}
      </span>
    </div>
  );
}
