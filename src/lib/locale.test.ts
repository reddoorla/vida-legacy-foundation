import { describe, it, expect } from "vitest";
import {
  isLangPrefix,
  langFromParam,
  langFromPrismic,
  localizePath,
  stripLangPrefix,
  pathForDoc,
  switchTarget,
  otherLang,
} from "./locale";

describe("locale prefixes", () => {
  it("recognises only the non-default locale as a URL prefix", () => {
    expect(isLangPrefix("es")).toBe(true);
    // English is the bare path — "/en" must never be a second URL for it.
    expect(isLangPrefix("en")).toBe(false);
    expect(isLangPrefix("about")).toBe(false);
    expect(isLangPrefix(undefined)).toBe(false);
  });

  it("maps the route param to a locale, defaulting to English", () => {
    expect(langFromParam("es")).toBe("es");
    expect(langFromParam(undefined)).toBe("en");
    expect(langFromParam("preview")).toBe("en");
  });

  it("maps Prismic locale ids, and refuses ones the site does not serve", () => {
    expect(langFromPrismic("en-us")).toBe("en");
    expect(langFromPrismic("es-mx")).toBe("es");
    expect(langFromPrismic("fr-fr")).toBeUndefined();
  });

  it("flips between the two", () => {
    expect(otherLang("en")).toBe("es");
    expect(otherLang("es")).toBe("en");
  });
});

describe("localizePath / stripLangPrefix / pathForDoc", () => {
  it("prefixes root-relative paths for Spanish and leaves English bare", () => {
    expect(localizePath("/about", "es")).toBe("/es/about");
    expect(localizePath("/", "es")).toBe("/es");
    expect(localizePath("/about", "en")).toBe("/about");
    expect(localizePath("/", "en")).toBe("/");
  });

  it("passes external, tel and empty hrefs through untouched", () => {
    expect(localizePath("https://registerme.org/", "es")).toBe("https://registerme.org/");
    expect(localizePath("tel:+17262346910", "es")).toBe("tel:+17262346910");
    expect(localizePath("", "es")).toBe("");
    expect(localizePath("//evil.example", "es")).toBe("//evil.example");
  });

  it("strips the prefix and nothing else", () => {
    expect(stripLangPrefix("/es/about")).toBe("/about");
    expect(stripLangPrefix("/es")).toBe("/");
    expect(stripLangPrefix("/about")).toBe("/about");
    // "/espanol" is not the "/es" prefix.
    expect(stripLangPrefix("/espanol")).toBe("/espanol");
  });

  it("puts the home document at the locale root", () => {
    expect(pathForDoc("home", "en")).toBe("/");
    expect(pathForDoc("home", "es")).toBe("/es");
    expect(pathForDoc("about", "es")).toBe("/es/about");
  });
});

describe("switchTarget", () => {
  const withTranslation = [
    { lang: "en" as const, href: "/about" },
    { lang: "es" as const, href: "/es/quienes-somos" },
  ];

  it("points at the current page's translation when it has one", () => {
    expect(switchTarget("en", withTranslation, "/about")).toEqual({
      lang: "es",
      href: "/es/quienes-somos",
      label: "Español",
      short: "ES",
    });
    expect(switchTarget("es", withTranslation, "/es/quienes-somos")?.href).toBe("/about");
  });

  it("offers nothing on a Prismic page with no translation yet", () => {
    // The prerender crawler follows every rendered link; a switch to a page
    // that does not exist would 404 the build.
    expect(switchTarget("en", [{ lang: "en", href: "/about" }], "/about")).toBeUndefined();
  });

  it("switches a localized static route by path", () => {
    expect(switchTarget("en", undefined, "/contact")?.href).toBe("/es/contact");
    expect(switchTarget("es", undefined, "/es/contact")?.href).toBe("/contact");
  });

  it("offers nothing on routes that exist in one locale only", () => {
    expect(switchTarget("en", undefined, "/dev/a11y-fixtures")).toBeUndefined();
  });
});
