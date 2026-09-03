import { describe, it, expect } from "vitest";
import { loadSiteConfig, footerColumns, type SiteConfig, type FooterText } from "./site-config";

describe("loadSiteConfig", () => {
  it("returns a well-formed config from the checked-in stub", () => {
    const config = loadSiteConfig();
    // The starter ships an empty stub; the shape must always be safe to spread
    // into <Nav items> / <Footer socials> without guards at the call site.
    expect(Array.isArray(config.nav.items)).toBe(true);
    expect(Array.isArray(config.footer.socials)).toBe(true);
  });

  it("serves the Spanish chrome for es, with localized internal hrefs", () => {
    const es = loadSiteConfig("es");
    expect(es.nav.items.map((i) => i.label)).toEqual([
      "Quiénes Somos",
      "Donar",
      "Contáctenos",
      "Conviértase en Donante",
    ]);
    expect(es.nav.items.find((i) => i.label === "Contáctenos")?.href).toBe("/es/contact");
    // The footer's fine print is the Spanish rights line.
    const fine = es.footer.columns?.[0].items.find((i) => "tone" in i && i.tone === "fine");
    expect(fine && "text" in fine ? fine.text : "").toContain("Todos los derechos reservados");
  });

  it("is the base config for the default locale, untouched by the overrides", () => {
    const en = loadSiteConfig("en");
    expect(en).toBe(loadSiteConfig());
    expect(en.nav.items.map((i) => i.label)).toEqual([
      "Who We Are",
      "Donate",
      "Contact Us",
      "Become a Donor",
    ]);
  });
});

describe("loadSiteConfig page references", () => {
  // A chrome item that names a Prismic page (`"page": "about"`) links to it
  // ONLY once that page is published: the loud-fail prerender follows every
  // internal link it renders, so a hard-coded "/about" would 404 the build
  // until the document exists. The layout hands in the published uids.
  const nav = (cfg: SiteConfig, label: string) => cfg.nav.items.find((i) => i.label === label);
  const footerRow = (cfg: SiteConfig, text: string) =>
    cfg.footer
      .columns!.flatMap((c) => c.items)
      .filter((i): i is FooterText => "text" in i)
      .find((i) => i.text === text);

  it("links a page reference once that page is published, unlinked before", () => {
    const before = nav(loadSiteConfig("en", []), "Who We Are");
    expect(before?.href).toBe("");
    // The reference is consumed: Nav and Footer only ever see hrefs.
    expect(before && "page" in before).toBe(false);
    expect(nav(loadSiteConfig("en", ["about"]), "Who We Are")?.href).toBe("/about");
  });

  it("localizes the resolved path", () => {
    expect(nav(loadSiteConfig("es", ["about"]), "Quiénes Somos")?.href).toBe("/es/about");
  });

  it("keeps the href fallback while the page is unpublished — Donate goes to LGL", () => {
    expect(nav(loadSiteConfig("en", ["about"]), "Donate")?.href).toMatch(
      /^https:\/\/secure\.lglforms\.com\//,
    );
    expect(nav(loadSiteConfig("en", ["donate"]), "Donate")?.href).toBe("/donate");
  });

  it("resolves footer rows the same way", () => {
    expect(footerRow(loadSiteConfig("en", []), "Who we are")?.href).toBeUndefined();
    expect(footerRow(loadSiteConfig("en", ["about"]), "Who we are")?.href).toBe("/about");
    expect(footerRow(loadSiteConfig("es", ["about"]), "Quiénes somos")?.href).toBe("/es/about");
  });

  it("never mutates the checked-in config", () => {
    loadSiteConfig("en", ["about", "donate"]);
    expect(nav(loadSiteConfig(), "Who We Are")?.href).toBe("");
    expect(nav(loadSiteConfig(), "Who We Are")?.page).toBe("about");
  });
});

describe("footerColumns", () => {
  const chromeCols = [{ items: [{ text: "Call us: (555) 123-4567", href: "tel:5551234567" }] }];
  const configWithColumns: SiteConfig = {
    nav: { items: [] },
    footer: { socials: [], columns: chromeCols },
  };

  it("prefers the per-route page-data columns when a route supplies them", () => {
    const pageCols = [{ items: [{ text: "from page data" }] }];
    expect(footerColumns(pageCols, configWithColumns)).toBe(pageCols);
  });

  it("falls back to the site-config chrome columns when page data has none", () => {
    // The regression this guards: a site whose footer is configured in
    // site-config.json, not page data — a layout reading only
    // page.data.footerColumns would drop it.
    expect(footerColumns(undefined, configWithColumns)).toBe(chromeCols);
  });

  it("returns undefined when neither supplies columns (fresh site → Footer placeholder)", () => {
    // Deliberately a hand-built empty config, NOT loadSiteConfig(): this asserts
    // the fallback *logic*, and sourcing it from the checked-in JSON made the
    // test fail the moment this site configured a real footer.
    const emptyConfig: SiteConfig = { nav: { items: [] }, footer: { socials: [] } };
    expect(footerColumns(undefined, emptyConfig)).toBeUndefined();
  });

  it("names the contact route the same way in the Spanish nav and footer", () => {
    // They drifted: the footer said "Contacto" (the client copy's section
    // HEADING) where the nav and the client's own link list say "Contáctenos".
    const es = loadSiteConfig("es");
    const nav = es.nav.items.find((i) => i.href === "/es/contact")?.label;
    const footer = (es.footer.columns ?? [])
      .flatMap((c) => c.items)
      .find((i) => "href" in i && i.href === "/es/contact");
    expect(nav).toBe("Contáctenos");
    expect(footer && "text" in footer ? footer.text : null).toBe("Contáctenos");
  });
});
