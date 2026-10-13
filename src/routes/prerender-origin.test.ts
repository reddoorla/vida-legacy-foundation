import { describe, it, expect, vi } from "vitest";

// robots.txt and sitemap.xml are prerendered here, so kit 3 hands them its
// placeholder origin, "http://sveltekit-prerender" (paths.origin is not set:
// sveltekit.config.js says why). Each must take $lib/seo's siteOrigin, which
// puts the build's production URL in its place. Kit 2 took that from
// prerender.origin, so these routes read url.origin directly; lifted as they
// were, production's robots.txt pointed crawlers at the placeholder. In vitest
// the build has no URL, so the build origin is fixed here through the mock.
vi.mock("$lib/seo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("$lib/seo")>();
  return {
    ...actual,
    siteOrigin: (url: Pick<URL, "origin"> | string) =>
      actual.siteOrigin(url, "https://vidalegacy.org"),
  };
});
vi.mock("$lib/prismicio", () => ({
  isPlaceholderRepo: false,
  createClient: () => ({
    getAllByType: async () => [
      { uid: "about", lang: "en-us", last_publication_date: "2026-09-01T00:00:00Z" },
    ],
  }),
}));

const robots = await import("./robots.txt/+server");
const sitemap = await import("./sitemap.xml/+server");

const PLACEHOLDER = "http://sveltekit-prerender";

describe("prerendered while the build had a production URL", () => {
  it("robots.txt names the production sitemap, not the placeholder", async () => {
    const res = await (robots.GET as unknown as (e: { url: URL }) => Response)({
      url: new URL(`${PLACEHOLDER}/robots.txt`),
    });
    const body = await res.text();
    expect(body).toContain("Sitemap: https://vidalegacy.org/sitemap.xml");
    expect(body).not.toContain(PLACEHOLDER);
  });

  it("sitemap.xml lists production URLs, not the placeholder", async () => {
    const res = await (
      sitemap.GET as unknown as (e: { fetch: typeof fetch; url: URL }) => Promise<Response>
    )({ fetch, url: new URL(`${PLACEHOLDER}/sitemap.xml`) });
    const xml = await res.text();
    expect(xml).toContain("<loc>https://vidalegacy.org/about</loc>");
    expect(xml).not.toContain(PLACEHOLDER);
  });
});
