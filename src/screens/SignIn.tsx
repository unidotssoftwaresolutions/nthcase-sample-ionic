import { IonButton, IonCard, IonCardContent, IonContent } from '@ionic/react';
import { useState } from 'react';
import { credentialsMatch, TEST_EMAIL, TEST_PASSWORD } from '../data/rules';
import { signIn } from '../data/store';
import { T, tid } from '../testIds';
import { Field, Icon, Screen } from '../ui/parts';

export const SIGN_IN_WRONG = 'Wrong email or password';
export const SIGN_IN_MISSING = 'Enter your email and password';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const problem = email.trim() === '' || password === '' ? SIGN_IN_MISSING : !credentialsMatch(email, password) ? SIGN_IN_WRONG : null;
    setError(problem);
    if (problem === null) signIn(email);
  }

  return (
    <Screen id={T.signinScreen}>
      <IonContent>
        <form
          className="mg-signin"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <span className="mg-mark">
            <Icon name="shop" size={48} />
          </span>
          <div>
            <h1 className="mg-display">Mossgrove</h1>
            <p className="mg-body-large mg-muted">Home and desk goods</p>
          </div>
          <Field
            id={T.signinEmail}
            label="Email"
            labelPlacement="floating"
            fill="outline"
            type="email"
            inputmode="email"
            autocomplete="email"
            enterkeyhint="next"
            className={error ? 'ion-invalid ion-touched' : undefined}
            value={email}
            onIonInput={(event) => {
              setEmail(String(event.detail.value ?? ''));
              setError(null);
            }}
          />
          <Field
            id={T.signinPassword}
            label="Password"
            labelPlacement="floating"
            fill="outline"
            type={showPassword ? 'text' : 'password'}
            autocomplete="current-password"
            enterkeyhint="done"
            className={error ? 'ion-invalid ion-touched' : undefined}
            value={password}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
            onIonInput={(event) => {
              setPassword(String(event.detail.value ?? ''));
              setError(null);
            }}
          >
            <IonButton
              slot="end"
              fill="clear"
              {...tid(T.signinPasswordToggle)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
            >
              <Icon name={showPassword ? 'eye_off' : 'eye'} slot="icon-only" />
            </IonButton>
          </Field>
          {error && (
            <p className="mg-error-line mg-body" role="alert">
              <Icon name="warning" size={18} />
              <span {...tid(T.signinError)}>{error}</span>
            </p>
          )}
          <IonButton {...tid(T.signinSubmit)} type="submit" expand="block" shape="round" className="mg-tall">
            Sign in
          </IonButton>
          <IonCard {...tid(T.signinTestAccount)} className="mg-test-account">
            <IonCardContent>
              <h2 className="mg-title-small">Test account</h2>
              <p className="mg-muted">This is a sample app. Sign in with:</p>
              <p className="mg-mono">{TEST_EMAIL}</p>
              <p className="mg-mono">{TEST_PASSWORD}</p>
              <IonButton
                {...tid(T.signinUseTestAccount)}
                fill="clear"
                onClick={() => {
                  setEmail(TEST_EMAIL);
                  setPassword(TEST_PASSWORD);
                  setError(null);
                }}
              >
                Use test account
              </IonButton>
            </IonCardContent>
          </IonCard>
        </form>
      </IonContent>
    </Screen>
  );
}
