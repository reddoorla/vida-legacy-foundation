import { describe, it, expect } from "vitest";
import {
  jsonLdScript,
  canonicalUrl,
  resolveOgImage,
  organizationJsonLd,
  composeTitle,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
} from "./seo";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const PRISMIC = "https://images.prismic.io/acme/abc.png?auto=compress";

// Assert against SITE_NAME rather than a literal: `/new-site` step 3b sets it
// per client, and hard-coding the template's default made these four tests fail
// on every generated site the moment it was de-branded (caught on the first real
// run, vida-legacy-foundation, 2026-09-01). The behaviour under test is
// composeTitle's, not the brand string's.
describe("composeTitle", () => {
  it("appends the site name for brand recall", () => {
    expect(composeTitle("Contact")).toBe(`Contact | ${SITE_NAME}`);
  });

  it("returns the bare site name for the home page (no page title)", () => {
    expect(composeTitle(undefined)).toBe(SITE_NAME);
    expect(composeTitle("")).toBe(SITE_NAME);
    expect(composeTitle("   ")).toBe(SITE_NAME);
  });

  it("does not double the brand when the title already contains it", () => {
    expect(composeTitle(SITE_NAME)).toBe(SITE_NAME);
    expect(composeTitle(`${SITE_NAME} Studio — Work`)).toBe(`${SITE_NAME} Studio — Work`);
  });
});

describe("jsonLdScript", () => {
  it("wraps data in an ld+json script tag", () => {
    const out = jsonLdScript({ "@type": "Thing", name: "x" });
    expect(out).toContain('<script type="application/ld+json">');
    expect(out).toContain('"@type":"Thing"');
    expect(out.endsWith("</script>")).toBe(true);
  });

  it("escapes < so CMS strings cannot break out of the script tag", () => {
    const out = jsonLdScript({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script><script>alert");
    expect(out).toContain("\\u003c/script>");
    // The only literal </script> is the real closing tag.
    expect(out.match(/<\/script>/g)).toHaveLength(1);
  });
});

describe("canonicalUrl", () => {
  it("drops the query string and hash", () => {
    expect(canonicalUrl(new URL("https://acme.com/about?utm_source=x#top"))).toBe(
      "https://acme.com/about",
    );
  });

  it("strips the /preview route segment", () => {
    expect(canonicalUrl(new URL("https://acme.com/preview/work"))).toBe("https://acme.com/work");
  });

  it("maps a bare /preview to the home page", () => {
    expect(canonicalUrl(new URL("https://acme.com/preview"))).toBe("https://acme.com/");
  });

  it("leaves a normal path untouched", () => {
    expect(canonicalUrl(new URL("https://acme.com/team/jane"))).toBe("https://acme.com/team/jane");
  });

  it("does not strip paths that merely start with the word preview", () => {
    expect(canonicalUrl(new URL("https://acme.com/previews/2024"))).toBe(
      "https://acme.com/previews/2024",
    );
  });

  it("accepts a string url", () => {
    expect(canonicalUrl("https://acme.com/x?y=1")).toBe("https://acme.com/x");
  });
});

describe("resolveOgImage", () => {
  it("returns undefined when there is no image", () => {
    expect(resolveOgImage(undefined, "https://acme.com")).toBeUndefined();
    expect(resolveOgImage("", "https://acme.com")).toBeUndefined();
  });

  it("crops a Prismic image to the card canvas and reports its size", () => {
    const og = resolveOgImage(PRISMIC, "https://acme.com");
    expect(og?.width).toBe(OG_IMAGE_WIDTH);
    expect(og?.height).toBe(OG_IMAGE_HEIGHT);
    const u = new URL(og!.url);
    expect(u.searchParams.get("w")).toBe(String(OG_IMAGE_WIDTH));
    expect(u.searchParams.get("h")).toBe(String(OG_IMAGE_HEIGHT));
    expect(u.searchParams.get("fit")).toBe("crop");
  });

  it("passes an absolute non-Prismic URL through without dimensions", () => {
    const og = resolveOgImage("https://cdn.example.com/card.jpg", "https://acme.com");
    expect(og).toEqual({ url: "https://cdn.example.com/card.jpg" });
  });

  it("makes a root-relative static asset absolute against the origin", () => {
    expect(resolveOgImage("/og-default.png", "https://acme.com")).toEqual({
      url: "https://acme.com/og-default.png",
    });
  });

  it("inserts the slash a bare relative path is missing", () => {
    // `src.startsWith("/")` → `startsWith("")` survived the scoped run: every
    // static path in the suite already began with a slash, so the branch
    // that adds one was never the one taken.
    expect(resolveOgImage("og-default.png", "https://acme.com")).toEqual({
      url: "https://acme.com/og-default.png",
    });
  });

  it("rejects a non-http(s) scheme instead of emitting it as a card", () => {
    expect(resolveOgImage("javascript:alert(1)", "https://acme.com")).toBeUndefined();
    expect(resolveOgImage("data:image/png;base64,AAAA", "https://acme.com")).toBeUndefined();
    expect(resolveOgImage("ftp://cdn.example.com/card.jpg", "https://acme.com")).toBeUndefined();
  });

  it("lets plain http through as well as https — the guard is an AND", () => {
    // 2026-09-05 audit (#60): the `!== "http:" && !== "https:"` guard survived
    // "both ways". The tests above only ever passed an https URL and only ever
    // rejected non-web schemes, so `&&` → `||` (which rejects EVERY scheme,
    // http included) and `!== "http:"` → `=== "http:"` had nothing to fail.
    expect(resolveOgImage("http://cdn.example.com/card.jpg", "https://acme.com")).toEqual({
      url: "http://cdn.example.com/card.jpg",
    });
  });
});

describe("DEFAULT_OG_IMAGE", () => {
  // 2026-09-05 audit (#60): blanking the constant survived — nothing read it.
  // +layout.svelte does `page.data.meta_image || DEFAULT_OG_IMAGE || undefined`,
  // so an empty default silently makes every page without a meta_image
  // imageless, and Twitter downgrades the share to a small summary.
  it("is set, so a page with no meta_image still gets a card", () => {
    expect(DEFAULT_OG_IMAGE).not.toBe("");
    expect(DEFAULT_OG_IMAGE || undefined).toBeDefined();
  });

  it("is a root-relative static asset that resolves against the page origin", () => {
    expect(DEFAULT_OG_IMAGE.startsWith("/")).toBe(true);
    expect(resolveOgImage(DEFAULT_OG_IMAGE, "https://acme.com")).toEqual({
      url: `https://acme.com${DEFAULT_OG_IMAGE}`,
    });
  });

  it("names a file that actually ships in static/", () => {
    // The doc comment says "set this to a shipped asset". A default that 404s
    // is worse than none: crawlers cache the broken card.
    expect(existsSync(resolve(process.cwd(), "static", DEFAULT_OG_IMAGE.slice(1)))).toBe(true);
  });
});

describe("organizationJsonLd", () => {
  it("emits the given type and drops empty fields", () => {
    const ld = organizationJsonLd({
      name: "Acme",
      url: "https://acme.com",
      type: "LocalBusiness",
      telephone: "",
      logo: undefined,
    }) as Record<string, unknown>;
    expect(ld["@type"]).toBe("LocalBusiness");
    expect(ld.name).toBe("Acme");
    expect("telephone" in ld).toBe(false);
    expect("logo" in ld).toBe(false);
  });

  it("defaults to Organization and nests a PostalAddress", () => {
    const ld = organizationJsonLd({
      name: "Acme",
      url: "https://acme.com",
      sameAs: ["https://instagram.com/acme"],
      address: {
        streetAddress: "1 Main",
        addressLocality: "Austin",
        addressRegion: "TX",
        postalCode: "78701",
      },
    }) as Record<string, unknown>;
    expect(ld["@type"]).toBe("Organization");
    expect(ld.sameAs).toEqual(["https://instagram.com/acme"]);
    expect(ld.address).toMatchObject({
      "@type": "PostalAddress",
      addressCountry: "US",
      addressLocality: "Austin",
    });
  });

  it("omits sameAs when the list is empty", () => {
    const ld = organizationJsonLd({
      name: "Acme",
      url: "https://acme.com",
      sameAs: [],
    }) as Record<string, unknown>;
    expect("sameAs" in ld).toBe(false);
  });
});
