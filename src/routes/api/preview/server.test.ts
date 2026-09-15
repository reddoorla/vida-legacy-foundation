import { beforeEach, describe, expect, it, vi } from "vitest";

// Added after the 2026-09-05 mutation audit (#59): six mutants, all
// NoCoverage. The one that matters is dropping `linkResolver` from the
// resolvePreviewURL call — the client is routes-free (see $lib/prismicio), so
// without it every preview lands on "/", and an es-mx editor previews the
// English path. CLAUDE.md, "Two locales, one route tree".

// Same seam as sitemap.xml/server.test.ts: the route calls `createClient`
// itself. The REAL `linkResolver` is kept so the locale claim is tested against
// the resolver that ships, not a stand-in.
const kit = vi.hoisted(() => ({
  redirectToPreviewURL: vi.fn(),
  enableAutoPreviews: vi.fn(),
}));
vi.mock("@prismicio/svelte/kit", () => ({
  redirectToPreviewURL: (...args: unknown[]) => kit.redirectToPreviewURL(...args),
  enableAutoPreviews: (...args: unknown[]) => kit.enableAutoPreviews(...args),
}));

const client = vi.hoisted(() => ({ resolvePreviewURL: vi.fn() }));
const createClient = vi.hoisted(() => vi.fn(() => client));
vi.mock("$lib/prismicio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$lib/prismicio")>()),
  createClient: (...args: unknown[]) => createClient(...args),
}));

const { GET } = await import("./+server");
const { linkResolver } = await import("$lib/prismicio");

type PreviewArgs = {
  client: { resolvePreviewURL: (args: Record<string, unknown>) => unknown };
  request: Request;
  cookies: unknown;
};

const request = new Request("https://vidalegacy.org/api/preview?token=t&documentId=d");
const cookies = { get: vi.fn(), set: vi.fn() };

const call = async () =>
  (GET as unknown as (e: { fetch: typeof fetch; request: Request; cookies: unknown }) => unknown)({
    fetch,
    request,
    cookies,
  });

beforeEach(() => {
  kit.redirectToPreviewURL.mockReset();
  client.resolvePreviewURL.mockReset();
  createClient.mockClear();
});

describe("GET /api/preview", () => {
  it("hands the request, cookies and a client to redirectToPreviewURL and returns its answer", async () => {
    // Deleting the whole call survived: the route would return undefined and
    // the preview would 500 (SvelteKit rejects a non-Response).
    const redirect = new Response(null, { status: 307, headers: { location: "/es/about" } });
    kit.redirectToPreviewURL.mockResolvedValue(redirect);
    expect(await call()).toBe(redirect);
    // The client is built on the event's fetch, not the global one — that is
    // what lets SvelteKit's server-side fetch carry the preview session.
    // `createClient({ fetch })` → `createClient({})` survived the scoped run.
    expect(createClient).toHaveBeenCalledWith({ fetch });
    expect(kit.redirectToPreviewURL).toHaveBeenCalledTimes(1);
    const args = kit.redirectToPreviewURL.mock.calls[0][0] as PreviewArgs;
    expect(args.request).toBe(request);
    expect(args.cookies).toBe(cookies);
    expect(typeof args.client.resolvePreviewURL).toBe("function");
  });

  it("threads the locale-aware linkResolver into resolvePreviewURL", async () => {
    // The helper accepts no resolver of its own; the route wraps the client so
    // every resolvePreviewURL call carries `linkResolver`. Dropping it from
    // the spread is the surviving mutant this test exists for.
    kit.redirectToPreviewURL.mockResolvedValue(new Response(null, { status: 307 }));
    client.resolvePreviewURL.mockResolvedValue("/es/about");
    await call();
    const { client: wrapped } = kit.redirectToPreviewURL.mock.calls[0][0] as PreviewArgs;
    const url = await wrapped.resolvePreviewURL({ defaultURL: "/", previewToken: "t" });
    expect(url).toBe("/es/about");
    expect(client.resolvePreviewURL).toHaveBeenCalledTimes(1);
    expect(client.resolvePreviewURL).toHaveBeenCalledWith({
      defaultURL: "/",
      previewToken: "t",
      linkResolver,
    });
  });

  it("resolves an es-mx page to its /es/ path, not the English one", async () => {
    // The claim behind the plumbing, tested against the real resolver: the
    // resolver the route threads through sends a Spanish document to "/es/…".
    kit.redirectToPreviewURL.mockResolvedValue(new Response(null, { status: 307 }));
    await call();
    const { client: wrapped } = kit.redirectToPreviewURL.mock.calls[0][0] as PreviewArgs;
    await wrapped.resolvePreviewURL({ defaultURL: "/" });
    const passed = client.resolvePreviewURL.mock.calls[0][0] as {
      linkResolver: (doc: { type: string; uid: string; lang: string }) => string | null;
    };
    expect(passed.linkResolver({ type: "page", uid: "about", lang: "es-mx" })).toBe("/es/about");
    expect(passed.linkResolver({ type: "page", uid: "about", lang: "en-us" })).toBe("/about");
  });
});
