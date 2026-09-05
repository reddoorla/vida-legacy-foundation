import { describe, it, expect } from "vitest";

import { match as lang } from "./lang";
import { match as preview } from "./preview";

/**
 * Both matchers scored 0% in the 2026-09-05 mutation audit — no coverage at
 * all. They are three lines each and decide whether a URL is a route: replacing
 * `lang` with `() => undefined` makes every `/es/*` path a 404, and the unit
 * suite had nothing to say about it. (The smoke suite would eventually notice,
 * two minutes and a browser later, and only for the routes it lists.)
 */

describe("the [[lang=lang]] matcher", () => {
  it("matches the Spanish prefix", () => {
    expect(lang("es")).toBe(true);
  });

  it("does not match 'en' — English is the bare path, not a prefix", () => {
    // `/en` is deliberately not a URL on this site. If this ever returns true
    // the English pages exist at two addresses and the canonical tags lie.
    expect(lang("en")).toBe(false);
  });

  it("does not match a page uid, so /about stays a page and not a locale", () => {
    for (const uid of ["about", "donate", "contact", "es-mx", "ES", ""]) {
      expect(lang(uid), `"${uid}" was taken for a locale prefix`).toBe(false);
    }
  });
});

describe("the [[preview=preview]] matcher", () => {
  it("matches only the literal segment", () => {
    expect(preview("preview")).toBe(true);
  });

  it("rejects anything else, including near misses", () => {
    for (const segment of ["previews", "Preview", "preview/", "", "about"]) {
      expect(preview(segment), `"${segment}" was taken for the preview segment`).toBe(false);
    }
  });
});
