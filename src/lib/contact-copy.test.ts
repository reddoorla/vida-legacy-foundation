import { describe, it, expect } from "vitest";
import { contactCopy } from "./contact-copy";
import { LANGS } from "./locale";

describe("contactCopy", () => {
  it("carries the action's failure copy in both locales", () => {
    // The route builds one action per locale from these, so a server-side
    // failure answers in the language the visitor is reading.
    for (const lang of LANGS) {
      expect(contactCopy(lang).error.length).toBeGreaterThan(0);
      expect(contactCopy(lang).unavailable.length).toBeGreaterThan(0);
    }
    expect(contactCopy("es").error).toContain("Algo salió mal");
    expect(contactCopy("es").unavailable).toContain("no está disponible");
  });

  it("falls back to the default locale outside a localized route", () => {
    expect(contactCopy(undefined).heading).toBe("Contact us");
    expect(contactCopy(null).heading).toBe("Contact us");
  });

  it("keeps every key in step across locales", () => {
    expect(Object.keys(contactCopy("es")).sort()).toEqual(Object.keys(contactCopy("en")).sort());
  });
});
