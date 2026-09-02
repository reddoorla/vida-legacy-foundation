import { describe, it, expect } from "vitest";
import { homeEntries, pageEntries } from "./prerender-entries";

const docs = [
  { uid: "home", lang: "en-us" },
  { uid: "about", lang: "en-us" },
  { uid: "home", lang: "es-mx" },
  { uid: "about", lang: "es-mx" },
  { uid: "secret", lang: "fr-fr" },
];

describe("homeEntries", () => {
  it("lists the root for every locale with a published home", () => {
    expect(homeEntries(docs)).toEqual([{}, { lang: "es" }]);
  });

  it("leaves out a locale whose home is not published yet", () => {
    // The route would 404 and, with loud-fail prerendering, break the build.
    expect(homeEntries(docs.filter((d) => d.lang === "en-us"))).toEqual([{}]);
  });
});

describe("pageEntries", () => {
  it("lists every non-home page in its locale and skips locales the site does not serve", () => {
    expect(pageEntries(docs)).toEqual([{ uid: "about" }, { lang: "es", uid: "about" }]);
  });

  it("skips documents without a uid", () => {
    expect(pageEntries([{ uid: null, lang: "en-us" }])).toEqual([]);
  });
});
