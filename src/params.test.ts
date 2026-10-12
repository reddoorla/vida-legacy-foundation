import { describe, it, expect } from "vitest";

import { params } from "./params";

/**
 * Both matchers scored 0% in the 2026-09-05 mutation audit — no coverage at
 * all. They are one line each and decide whether a URL is a route: replacing
 * `lang` with `() => undefined` makes every `/es/*` path a 404, and the unit
 * suite had nothing to say about it.
 *
 * Kit 3 changed what a matcher means: it returns the param's value, and only
 * `undefined` fails. kit 2's boolean `isLangPrefix(param)`, lifted as written,
 * returns `false` for "about", which kit 3 takes as a match, so `[[lang=lang]]`
 * would swallow every first segment. These tests run each matcher through
 * kit's own validate path, so a boolean matcher goes red here.
 */
function run(name: keyof typeof params, segment: string): unknown {
  const result = params[name]["~standard"].validate(segment) as
    { value: unknown } | { issues: unknown[] };
  return "issues" in result ? undefined : result.value;
}

describe("the [[lang=lang]] matcher", () => {
  it("matches the Spanish prefix, with the prefix as its value", () => {
    expect(run("lang", "es")).toBe("es");
  });

  it("does not match 'en' — English is the bare path, not a prefix", () => {
    // `/en` is deliberately not a URL on this site. If this ever matches
    // the English pages exist at two addresses and the canonical tags lie.
    expect(run("lang", "en")).toBeUndefined();
  });

  it("does not match a page uid, so /about stays a page and not a locale", () => {
    for (const uid of ["about", "donate", "contact", "es-mx", "ES", ""]) {
      expect(run("lang", uid), `"${uid}" was taken for a locale prefix`).toBeUndefined();
    }
  });
});

describe("the [[preview=preview]] matcher", () => {
  it("matches only the literal segment", () => {
    expect(run("preview", "preview")).toBe("preview");
  });

  it("rejects anything else, including near misses", () => {
    for (const segment of ["previews", "Preview", "preview/", "", "about"]) {
      expect(
        run("preview", segment),
        `"${segment}" was taken for the preview segment`,
      ).toBeUndefined();
    }
  });
});
