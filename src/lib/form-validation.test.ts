import { describe, it, expect } from "vitest";
import { validationCopy, fieldError, validateForm, focusFirstInvalid } from "./form-validation";

const form = (html: string) => {
  const f = document.createElement("form");
  f.innerHTML = html;
  document.body.append(f);
  return f;
};

describe("form validation copy", () => {
  it("answers in the page's language, not the browser's", () => {
    // Measured on the live /es/contact before this: an empty field gave
    // "Please fill out this field." and a bad address "Please include an '@'
    // in the email address." — English, on a fully Spanish form.
    expect(validationCopy("es").required).toBe("Por favor, complete este campo.");
    expect(validationCopy("es").email).toContain("correo electrónico");
    expect(validationCopy(undefined).required).toBe("Please fill in this field.");
  });
});

describe("fieldError", () => {
  it("tells a missing value from a malformed one", () => {
    const f = form(`<input name="email" type="email" required />`);
    const el = f.querySelector("input")!;
    expect(fieldError(el, validationCopy("en"))).toBe("Please fill in this field.");
    el.value = "nope";
    expect(fieldError(el, validationCopy("en"))).toContain("email address");
    el.value = "ada@example.com";
    expect(fieldError(el, validationCopy("en"))).toBe("");
    f.remove();
  });
});

describe("validateForm", () => {
  it("collects one message per named control", () => {
    const f = form(`
      <input name="name" required />
      <input name="email" type="email" required />
      <input name="phone" type="tel" />
      <textarea name="message" required></textarea>`);
    expect(Object.keys(validateForm(f, validationCopy("en"))).sort()).toEqual([
      "email",
      "message",
      "name",
    ]);
    f.remove();
  });

  // All three anti-bot fields, each `required` and each empty, so each would
  // be reported if the skip list ever stopped naming it. The 2026-09-05 audit
  // (#60) blanked the default skip list to `[]` and nothing went red: the
  // fixture only carried two of the three names, and the Turnstile response —
  // the one a real visitor cannot fill in until the widget has — was never
  // exercised.
  const ANTI_BOT = `
    <input name="bot-field" required />
    <input name="ts" required />
    <input name="cf-turnstile-response" required />`;

  it("never reports the honeypot, timing token or Turnstile response, which the visitor cannot see", () => {
    // The anti-bot fields are the action's business. A message under a field
    // that is not on the screen would be unfixable.
    const f = form(ANTI_BOT);
    expect(validateForm(f, validationCopy("en"))).toEqual({});
    f.remove();
  });

  it("would report all three if the default skip list did not name them", () => {
    // The instrument, proven: the fixture above is only silent BECAUSE of the
    // skip list. With an empty one passed explicitly, every anti-bot field is
    // a visible error — the failure mode of the surviving mutant.
    const f = form(ANTI_BOT);
    expect(Object.keys(validateForm(f, validationCopy("en"), [])).sort()).toEqual([
      "bot-field",
      "cf-turnstile-response",
      "ts",
    ]);
    f.remove();
  });

  it("still reports the visitor's own fields alongside the hidden ones", () => {
    const f = form(`${ANTI_BOT}<input name="email" type="email" required />`);
    expect(validateForm(f, validationCopy("en"))).toEqual({
      email: "Please fill in this field.",
    });
    f.remove();
  });

  it("skips disabled controls", () => {
    const f = form(`<input name="name" required disabled />`);
    expect(validateForm(f, validationCopy("en"))).toEqual({});
    f.remove();
  });

  it("skips unnamed controls, which have no key to report under", () => {
    // `!el.name` survived the scoped run: a disabled control never validates
    // anyway (willValidate is false), so only an unnamed, required one tells
    // the skip from no skip — without it the error lands under "".
    const f = form(`<input required /><input name="name" required />`);
    expect(validateForm(f, validationCopy("en"))).toEqual({
      name: "Please fill in this field.",
    });
    f.remove();
  });
});

describe("focusFirstInvalid", () => {
  it("puts the visitor on the first thing to fix, in document order", () => {
    const f = form(`<input name="name" /><input name="email" /><input name="message" />`);
    focusFirstInvalid(f, { message: "x", email: "x" });
    expect(document.activeElement).toBe(f.querySelector("[name='email']"));
    f.remove();
  });
});
