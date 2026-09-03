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

  it("carries a meta description for a route Prismic does not author", () => {
    // DEFAULT_DESCRIPTION is deliberately empty — a generic line repeated on
    // every result is worse than none — so a static route that says nothing
    // ships with no description at all. /contact and /es/contact did.
    for (const lang of LANGS) {
      const d = contactCopy(lang).metaDescription;
      expect(d.length).toBeGreaterThan(80);
      // Google truncates a snippet around 155-160 characters.
      expect(d.length).toBeLessThanOrEqual(158);
      expect(d).toContain("Vida Legacy Foundation");
    }
    // The client's own words, from content/es-website-content.txt and the
    // live /es hero, not a translation of the English: "asistencia económica"
    // and "familias de donantes y receptores".
    expect(contactCopy("es").metaDescription).toContain("asistencia económica");
    expect(contactCopy("es").metaDescription).toContain("familias de donantes y receptores");
    expect(contactCopy("es").metaDescription).toMatch(/Comuníquese|Pregúntenos|pregúntenos/);
  });
});
