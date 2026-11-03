import type { CategoryKey } from './catalog';

/** The club form's fields, as typed. */
export interface ClubForm {
  name: string;
  email: string;
  age: string;
  password: string;
  category: CategoryKey | null;
  date: string | null;
  newsletter: boolean;
  budget: number;
  terms: boolean;
}

export const EMPTY_FORM: ClubForm = {
  name: '',
  email: '',
  age: '',
  password: '',
  category: null,
  date: null,
  newsletter: false,
  budget: 50,
  terms: false,
};

/** One message per invalid field. The texts are part of the spec: every framework shows the same words. */
export const FORM_ERRORS = {
  name: 'Enter your name',
  email: 'Enter a valid email address',
  age: 'Enter an age from 18 to 120',
  password: 'Use at least 8 characters, including a number',
  category: 'Choose a favourite aisle',
  date: 'Choose a delivery date',
  terms: 'Accept the terms to continue',
} as const;

export type FormField = keyof typeof FORM_ERRORS;

const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function formErrors(form: ClubForm): Partial<Record<FormField, string>> {
  const errors: Partial<Record<FormField, string>> = {};
  if (form.name.trim() === '') errors.name = FORM_ERRORS.name;
  if (!EMAIL_SHAPE.test(form.email.trim())) errors.email = FORM_ERRORS.email;
  const age = /^\d+$/.test(form.age.trim()) ? Number.parseInt(form.age.trim(), 10) : NaN;
  if (!(age >= 18 && age <= 120)) errors.age = FORM_ERRORS.age;
  if (form.password.length < 8 || !/\d/.test(form.password)) errors.password = FORM_ERRORS.password;
  if (form.category === null) errors.category = FORM_ERRORS.category;
  if (form.date === null) errors.date = FORM_ERRORS.date;
  if (!form.terms) errors.terms = FORM_ERRORS.terms;
  return errors;
}

/** The Age field keeps digits only, three at most. */
export function ageInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 3);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "15 Nov 2026" from the date picker's "2026-11-15": the delivery date as every framework writes it. */
export function formatPickedDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map((part) => Number.parseInt(part, 10));
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export const TEST_EMAIL = 'tester@mossgrove.test';
export const TEST_PASSWORD = 'Mossgrove123';

/** The one check of the sign-in screen. Email case and surrounding spaces do not matter; the password's case does. */
export function credentialsMatch(email: string, password: string): boolean {
  return email.trim().toLowerCase() === TEST_EMAIL && password === TEST_PASSWORD;
}

export const GIFT_CARD_CODE = 'MOSS-0025';

/** A shake is three jolts above 2.5 g within one second. Pure, so tests can feed it readings. */
export class ShakeDetector {
  static readonly EARTH_GRAVITY = 9.80665;
  static readonly THRESHOLD_G = 2.5;
  static readonly WINDOW_MS = 1000;
  static readonly JOLTS = 3;

  private jolts: number[] = [];

  constructor(private readonly onShake: () => void) {}

  onReading(x: number, y: number, z: number, timestampMs: number): void {
    const g = Math.sqrt(x * x + y * y + z * z) / ShakeDetector.EARTH_GRAVITY;
    if (g < ShakeDetector.THRESHOLD_G) return;
    this.jolts.push(timestampMs);
    this.jolts = this.jolts.filter((t) => timestampMs - t <= ShakeDetector.WINDOW_MS);
    if (this.jolts.length >= ShakeDetector.JOLTS) {
      this.jolts = [];
      this.onShake();
    }
  }
}

/** A swipe's direction, from its total travel; null when it travelled less than [minPx]. The longest axis wins. */
export function swipeDirection(dx: number, dy: number, minPx: number): 'left' | 'right' | 'up' | 'down' | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < minPx) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** `nthcase-sample://item/{id}`: the item id as written in the link, or null for any other link. */
export function deepLinkItemId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /^nthcase-sample:\/\/item\/([^/?#]+)\/?(?:[?#].*)?$/i.exec(url.trim());
  if (!match || !url.trim().toLowerCase().startsWith('nthcase-sample://item/')) return null;
  const id = decodeURIComponent(match[1]).trim();
  return id === '' ? null : id;
}
