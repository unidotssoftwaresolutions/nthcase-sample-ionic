import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonContent,
  IonDatetime,
  IonModal,
  IonRange,
  IonToggle,
  useIonActionSheet,
} from '@ionic/react';
import { useState } from 'react';
import { CATEGORIES, categoryLabel } from '../data/catalog';
import { ageInput, EMPTY_FORM, formatPickedDate, formErrors, type ClubForm } from '../data/rules';
import { showSnack, upOrShop } from '../data/store';
import { T, tid } from '../testIds';
import { registerOverlay, useOverlay } from '../ui/overlays';
import { ErrorLine, Field, Icon, Screen, TopBar } from '../ui/parts';

export const JOINED_MESSAGE = 'Welcome to the club';

export function FormScreen() {
  const [form, setForm] = useState<ClubForm>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [presentSheet, dismissSheet] = useIonActionSheet();
  useOverlay(dateOpen, () => setDateOpen(false));

  const edit = (patch: Partial<ClubForm>) => setForm((current) => ({ ...current, ...patch }));
  // Errors appear after the first Join, then follow every edit.
  const errors = submitted ? formErrors(form) : {};
  const invalid = (field: keyof typeof errors) => (errors[field] ? 'ion-invalid ion-touched' : undefined);

  function chooseAisle() {
    const unregister = registerOverlay(() => void dismissSheet());
    void presentSheet({
      header: 'Favourite aisle',
      // An action sheet draws its buttons in the light DOM, so each option's id sits on its own native <button>.
      buttons: [
        ...CATEGORIES.map((category) => ({
          text: category.label,
          id: T.formCategoryOption(category.key),
          htmlAttributes: { 'data-testid': T.formCategoryOption(category.key), role: 'radio', 'aria-checked': String(form.category === category.key) },
          handler: () => edit({ category: category.key }),
        })),
        { text: 'Cancel', role: 'cancel' },
      ],
      onDidDismiss: unregister,
    });
  }

  function join() {
    setSubmitted(true);
    if (Object.keys(formErrors(form)).length > 0) {
      setJoined(null);
      return;
    }
    setJoined(
      `Welcome, ${form.name.trim()}. We'll write to ${form.email.trim()} about the ${categoryLabel(form.category!)} aisle ` +
        `and deliver on ${form.date!}.`,
    );
    showSnack(JOINED_MESSAGE);
  }

  return (
    <Screen id={T.formScreen}>
      <TopBar title="Join the club" onBack={upOrShop} />
      <IonContent>
        <div className="mg-column mg-form">
          <p className="mg-body mg-muted">Members hear about new drawers first. Every field is required except the newsletter.</p>

          <div>
            <Field id={T.formName} label="Full name" labelPlacement="floating" fill="outline" autocomplete="name" className={invalid('name')} value={form.name} onIonInput={(e) => edit({ name: String(e.detail.value ?? '') })} />
            <ErrorLine error={errors.name} id={T.formNameError} />
          </div>
          <div>
            <Field id={T.formEmail} label="Email" labelPlacement="floating" fill="outline" type="email" inputmode="email" autocomplete="email" className={invalid('email')} value={form.email} onIonInput={(e) => edit({ email: String(e.detail.value ?? '') })} />
            <ErrorLine error={errors.email} id={T.formEmailError} />
          </div>
          <div>
            <Field
              id={T.formAge}
              label="Age"
              labelPlacement="floating"
              fill="outline"
              inputmode="numeric"
              maxlength={3}
              className={invalid('age')}
              value={form.age}
              onIonInput={(e) => {
                const digits = ageInput(String(e.detail.value ?? ''));
                // keep the field itself to digits too, not only the state
                (e.target as HTMLIonInputElement).value = digits;
                edit({ age: digits });
              }}
            />
            <ErrorLine error={errors.age} id={T.formAgeError} />
          </div>
          <div>
            <Field
              id={T.formPassword}
              label="Password"
              labelPlacement="floating"
              fill="outline"
              type={showPassword ? 'text' : 'password'}
              autocomplete="new-password"
              className={invalid('password')}
              value={form.password}
              onIonInput={(e) => edit({ password: String(e.detail.value ?? '') })}
            >
              <IonButton slot="end" fill="clear" {...tid(T.formPasswordToggle)} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>
                <Icon name={showPassword ? 'eye_off' : 'eye'} slot="icon-only" />
              </IonButton>
            </Field>
            <ErrorLine error={errors.password} id={T.formPasswordError} />
          </div>

          <div>
            <Field
              id={T.formCategory}
              label="Favourite aisle"
              labelPlacement="floating"
              fill="outline"
              readonly
              className={`mg-picker ${invalid('category') ?? ''}`}
              value={form.category ? categoryLabel(form.category) : ''}
              onClick={chooseAisle}
            >
              <span slot="end" className="mg-muted mg-picker-caret" aria-hidden>
                <Icon name="chevron" />
              </span>
            </Field>
            <ErrorLine error={errors.category} id={T.formCategoryError} />
          </div>

          <div>
            <Field label="Delivery date" labelPlacement="floating" fill="outline" readonly className={invalid('date')} value={form.date ?? ''}>
              <IonButton slot="end" fill="clear" {...tid(T.formDate)} aria-label="Choose a delivery date" onClick={() => {
                setPicked(null);
                setDateOpen(true);
              }}>
                <Icon name="calendar" slot="icon-only" />
              </IonButton>
            </Field>
            <ErrorLine error={errors.date} id={T.formDateError} />
          </div>

          <IonToggle {...tid(T.formNewsletter)} className="mg-toggle-row" justify="space-between" checked={form.newsletter} onIonChange={(e) => edit({ newsletter: e.detail.checked })}>
            Email me about new drawers
          </IonToggle>

          <div>
            <div className="mg-row">
              <span className="mg-body-large mg-grow">Monthly budget</span>
              <span className="mg-title" {...tid(T.formBudgetValue)}>
                ${form.budget}
              </span>
            </div>
            <IonRange
              {...tid(T.formBudget)}
              aria-label="Monthly budget"
              min={0}
              max={200}
              step={10}
              snaps
              ticks={false}
              value={form.budget}
              onIonInput={(e) => edit({ budget: Number(e.detail.value) })}
            />
          </div>

          <div>
            <IonCheckbox {...tid(T.formTerms)} className="mg-toggle-row" labelPlacement="end" justify="start" checked={form.terms} onIonChange={(e) => edit({ terms: e.detail.checked })}>
              I accept the club terms
            </IonCheckbox>
            <ErrorLine error={errors.terms} id={T.formTermsError} />
          </div>

          <IonButton {...tid(T.formSubmit)} expand="block" shape="round" className="mg-tall" onClick={join}>
            Join
          </IonButton>

          {joined && (
            <IonCard className="mg-joined">
              <IonCardContent>
                <span className="mg-row mg-top">
                  <Icon name="check" />
                  <span {...tid(T.formResult)} role="status">
                    {joined}
                  </span>
                </span>
              </IonCardContent>
            </IonCard>
          )}
        </div>
      </IonContent>

      <IonModal isOpen={dateOpen} className="mg-dialog mg-date-dialog" onDidDismiss={() => setDateOpen(false)}>
        <div className="mg-dialog-body">
          {/* Opens on the current month: the one thing in the app that depends on the date (SPEC.md §2). */}
          <IonDatetime
            {...tid(T.formDatePicker)}
            presentation="date"
            locale="en-US"
            firstDayOfWeek={0}
            value={picked}
            onIonChange={(e) => setPicked(typeof e.detail.value === 'string' ? e.detail.value : null)}
          />
          <div className="mg-dialog-actions">
            <IonButton {...tid(T.formDateCancel)} fill="clear" onClick={() => setDateOpen(false)}>
              Cancel
            </IonButton>
            <IonButton
              {...tid(T.formDateConfirm)}
              fill="clear"
              disabled={picked === null}
              onClick={() => {
                if (picked) edit({ date: formatPickedDate(picked) });
                setDateOpen(false);
              }}
            >
              OK
            </IonButton>
          </div>
        </div>
      </IonModal>
    </Screen>
  );
}
