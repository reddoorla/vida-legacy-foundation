/** Field validation messages the PAGE writes, in the page's language.
 *
 *  Native constraint validation is the browser's, and it speaks the BROWSER's
 *  language: a fully Spanish contact form answered an empty field with "Please
 *  fill out this field." and a bad address with "Please include an '@' in the
 *  email address." It also puts them in a transient bubble that appears on one
 *  field at a time, is not in the accessibility tree as an error, and is gone
 *  the moment focus moves — so it is the wrong mechanism twice over.
 *
 *  These messages are shown in a real element beside the field instead, tied
 *  to it with aria-describedby and aria-invalid. The constraints themselves
 *  stay on the inputs (`required`, `type="email"`): they are what a visitor
 *  WITHOUT scripts is guarded by, since `novalidate` is set from an effect and
 *  so only ever applies where the page can do the job itself.
 *
 *  Shared by the contact panel and the donation form, the same way their
 *  labels and the `.vlf-*` vocabulary are. */
import { DEFAULT_LANG, type Lang } from "$lib/locale";

const COPY = {
  en: {
    required: "Please fill in this field.",
    email: "Please enter an email address, like name@example.com.",
    tel: "Please enter a phone number.",
    invalid: "Please check this field.",
  },
  es: {
    required: "Por favor, complete este campo.",
    email: "Por favor, escriba un correo electrónico, por ejemplo nombre@ejemplo.com.",
    tel: "Por favor, escriba un número de teléfono.",
    invalid: "Por favor, revise este campo.",
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type ValidationCopy = (typeof COPY)[Lang];

export function validationCopy(lang: Lang | undefined | null): ValidationCopy {
  return COPY[lang ?? DEFAULT_LANG];
}

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const isControl = (el: Element): el is Control =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement;

/** What is wrong with one control, in words. Empty when it is fine. */
export function fieldError(el: Control, copy: ValidationCopy): string {
  if (!el.willValidate || el.validity.valid) return "";
  if (el.validity.valueMissing) return copy.required;
  if (el.validity.typeMismatch)
    return el instanceof HTMLInputElement && el.type === "tel" ? copy.tel : copy.email;
  return copy.invalid;
}

/** Every control in the form that has something wrong with it, by name.
 *
 *  Skips the unnamed and the disabled — and the honeypot, which is `required`
 *  in no browser but must never be reported to a human either, since the whole
 *  point is that they cannot see it. */
export function validateForm(
  form: HTMLFormElement,
  copy: ValidationCopy,
  skip: readonly string[] = ["bot-field", "ts", "cf-turnstile-response"],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const el of Array.from(form.elements)) {
    if (!isControl(el) || !el.name || el.disabled || skip.includes(el.name)) continue;
    // A radio group reports once, under its shared name.
    if (errors[el.name]) continue;
    const message = fieldError(el, copy);
    if (message) errors[el.name] = message;
  }
  return errors;
}

/** Put the visitor on the first thing they have to fix. */
export function focusFirstInvalid(form: HTMLFormElement, errors: Record<string, string>): void {
  for (const el of Array.from(form.elements)) {
    if (isControl(el) && errors[el.name]) {
      el.focus();
      return;
    }
  }
}
