import { describe, expect, it, vi, beforeEach } from "vitest";

import { LANGS, LOCALIZED_STATIC_ROUTES, localizePath } from "$lib/locale";

// The route calls `createClient` itself rather than taking one, so the module is
// the seam. `isPlaceholderRepo` is a const export, so each test rewrites it
// through the mocked module object.
const prismicio = vi.hoisted(() => ({
  isPlaceholderRepo: false,
  pages: [] as unknown[],
  getAllByType: vi.fn(),
}));
vi.mock("$lib/prismicio", () => ({
  get isPlaceholderRepo() {
    return prismicio.isPlaceholderRepo;
  },
  createClient: () => ({
    getAllByType: async (...args: unknown[]) => {
      prismicio.getAllByType(...args);
      return prismicio.pages;
    },
  }),
}));

const { GET, prerender } = await import("./+server");

const page = (uid: string, lang: string) => ({
  uid,
  lang,
  last_publication_date: "2026-09-01T00:00:00Z",
});

const respond = async () =>
  (GET as unknown as (e: { fetch: typeof fetch; url: URL }) => Promise<Response>)({
    fetch,
    url: new URL("https://vidalegacy.org/sitemap.xml"),
  });

const render = async () => (await respond()).text();

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

beforeEach(() => {
  prismicio.isPlaceholderRepo = false;
  prismicio.pages = [];
  prismicio.getAllByType.mockClear();
});

describe("sitemap.xml", () => {
  it("lists every page document in every locale, home at the locale root", async () => {
    prismicio.pages = [page("home", "en-us"), page("home", "es-mx"), page("about", "en-us")];
    expect(locs(await render())).toEqual([
      "https://vidalegacy.org/",
      "https://vidalegacy.org/es",
      "https://vidalegacy.org/about",
      // ...then the static routes, below.
      "https://vidalegacy.org/contact",
      "https://vidalegacy.org/es/contact",
    ]);
  });

  it("includes the localized static routes, which no page document backs", async () => {
    // The regression this file exists for: the map above enumerates `page`
    // documents, and /contact is not one — so the only crawlable URLs the CMS
    // does not own were the only two the sitemap omitted. Asserted against
    // LOCALIZED_STATIC_ROUTES itself, so adding a route there without adding it
    // here cannot silently drop it from the sitemap.
    const expected = LOCALIZED_STATIC_ROUTES.flatMap((r) =>
      LANGS.map((l) => `https://vidalegacy.org${localizePath(r, l)}`),
    );
    const found = locs(await render());
    for (const url of expected) expect(found).toContain(url);
    expect(expected).toContain("https://vidalegacy.org/contact");
    expect(expected).toContain("https://vidalegacy.org/es/contact");
  });

  it("gives the static routes no lastmod, and the documents theirs", async () => {
    // There is no publication date for a static route, and stamping build time
    // would rewrite the sitemap on every deploy — telling crawlers a page
    // changed when it did not. lastmod is optional; omitting it is the honest
    // answer. One <lastmod> per document, none for the two static routes.
    prismicio.pages = [page("home", "en-us")];
    const xml = await render();
    expect(xml.match(/<lastmod>/g) ?? []).toHaveLength(1);
    expect(locs(xml)).toHaveLength(3);
    expect(xml).toContain("<lastmod>2026-09-01T00:00:00.000Z</lastmod>");
  });

  it("still emits the static routes on an unwired starter", async () => {
    // The Prismic query is skipped so the prerender succeeds before a repo
    // exists — but /contact is a real route on the bare starter too, so it
    // belongs in the sitemap either way.
    prismicio.isPlaceholderRepo = true;
    prismicio.pages = [page("home", "en-us")];
    expect(locs(await render())).toEqual([
      "https://vidalegacy.org/contact",
      "https://vidalegacy.org/es/contact",
    ]);
  });

  it("is well-formed XML with the sitemap namespace", async () => {
    prismicio.pages = [page("home", "en-us")];
    const xml = await render();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
    expect(xml.match(/<url>/g)).toHaveLength(xml.match(/<\/url>/g)?.length ?? 0);
  });
  // Both added after the 2026-09-05 mutation audit, where each survived: the
  // route was asserted entirely through its XML string, so nothing outside the
  // body was ever read.
  it("is served as XML, with a body", async () => {
    prismicio.pages = [page("home", "en-us")];
    const res = await respond();
    // Deleting the header survived, and a sitemap served as text/html is one
    // crawlers may decline to parse.
    expect(res.headers.get("content-type")).toBe("application/xml");
    // And blanking the joined <url> list survived too — a well-formed, valid,
    // completely empty sitemap.
    expect(locs(await res.text()).length).toBeGreaterThan(0);
  });

  it("is prerendered", () => {
    // Flipping this to false survived. The sitemap would still be correct, and
    // it would become a Netlify function invoked on every crawl instead of a
    // file — the kind of regression that shows up on a bill, not in a test.
    expect(prerender).toBe(true);
  });
  it("asks Prismic for every locale, not just the master one", async () => {
    // The mocked client ignores its arguments, so blanking the type name or
    // dropping `lang: "*"` both survived the 2026-09-05 audit while every
    // assertion above stayed green. Without the wildcard the sitemap silently
    // becomes English-only — a whole locale missing, and nothing red.
    prismicio.pages = [page("home", "en-us")];
    await render();
    expect(prismicio.getAllByType).toHaveBeenCalledWith("page", { lang: "*" });
  });

  it("renders a page document with no uid at the locale root", async () => {
    // `page.uid ?? "home"`: Prismic's uid is nullable in the type, and the
    // fallback had no coverage at all.
    prismicio.pages = [{ uid: null, lang: "es-mx", last_publication_date: "2026-09-01T00:00:00Z" }];
    expect(locs(await render())).toContain("https://vidalegacy.org/es");
  });
});
