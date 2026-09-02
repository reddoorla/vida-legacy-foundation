import { describe, it, expect } from "vitest";
import { publishedUids } from "./published-pages";

describe("publishedUids", () => {
  const docs = [
    { uid: "home", lang: "en-us" },
    { uid: "about", lang: "en-us" },
    { uid: "home", lang: "es-mx" },
    { uid: null, lang: "en-us" },
    { uid: "about", lang: "fr-fr" },
  ];

  it("lists the uids published in the locale, and only those", () => {
    expect(publishedUids(docs, "en").sort()).toEqual(["about", "home"]);
    // The English about page must not lend its uid to the Spanish nav.
    expect(publishedUids(docs, "es")).toEqual(["home"]);
  });

  it("is empty when nothing is published", () => {
    expect(publishedUids([], "en")).toEqual([]);
  });
});
