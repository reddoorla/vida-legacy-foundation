import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { handle } from "./hooks.server";
import {
  CMS_FRAMED_ROUTES,
  CMS_FRAME_ANCESTORS,
  isCmsFramedRoute,
  widenFrameAncestors,
} from "$lib/security/cms-framing";
import { prerender as sliceSimulatorPrerender } from "./routes/slice-simulator/+page";

const POLICY =
  "default-src 'self'; frame-src 'self' https://player.vimeo.com; frame-ancestors 'self'; base-uri 'self'";

const HOME = "/[[lang=lang]]/[[preview=preview]]";
const PAGE = "/[[lang=lang]]/[[preview=preview]]/[uid]";
const CONTACT = "/[[lang=lang]]/contact";
const SIMULATOR = "/slice-simulator";

async function headersFor(
  pathname: string,
  routeId: string | null,
  policy: string | null = POLICY,
  upstream: Record<string, string> = {},
) {
  const response = await handle({
    event: {
      url: new URL(`https://vidalegacy.org${pathname}`),
      params: {},
      route: { id: routeId },
    } as never,
    resolve: async () =>
      new Response("<html></html>", {
        headers: {
          "content-type": "text/html",
          ...(policy ? { "Content-Security-Policy": policy } : {}),
          ...upstream,
        },
      }),
  });
  return response.headers;
}

describe("CMS framing", () => {
  it("keeps every ordinary page SAMEORIGIN with frame-ancestors 'self'", async () => {
    for (const [path, routeId] of [
      ["/", HOME],
      ["/about", PAGE],
      ["/es/donate", PAGE],
      ["/contact", CONTACT],
    ]) {
      const headers = await headersFor(path, routeId);
      expect(headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
      expect(headers.get("Content-Security-Policy")).toBe(POLICY);
    }
  });

  it("lets Prismic frame /slice-simulator: no X-Frame-Options, widened frame-ancestors", async () => {
    const headers = await headersFor("/slice-simulator", SIMULATOR);
    expect(headers.get("X-Frame-Options")).toBeNull();
    const csp = headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain(CMS_FRAME_ANCESTORS);
    expect(csp.match(/frame-ancestors/g)).toHaveLength(1);
    expect(csp).toContain("frame-src 'self' https://player.vimeo.com");
    expect(csp).toContain("base-uri 'self'");
    // The route's other security headers are unchanged.
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  // Nothing upstream of the hook sets X-Frame-Options today, so without this
  // case the hook's delete could go and every other test would stay green.
  it("removes an X-Frame-Options set upstream of the hook on /slice-simulator only", async () => {
    const upstream = { "X-Frame-Options": "DENY" };
    expect(
      (await headersFor("/slice-simulator", SIMULATOR, POLICY, upstream)).get("X-Frame-Options"),
    ).toBeNull();
    expect((await headersFor("/about", PAGE, POLICY, upstream)).get("X-Frame-Options")).toBe(
      "SAMEORIGIN",
    );
  });

  it("frames the route SvelteKit resolved, so an encoded path gets the same headers", async () => {
    const headers = await headersFor("/slice%2Dsimulator", SIMULATOR);
    expect(headers.get("X-Frame-Options")).toBeNull();
    expect(headers.get("Content-Security-Policy")).toContain(CMS_FRAME_ANCESTORS);
  });

  it("keeps a path that only looks like the simulator SAMEORIGIN when no route matched", async () => {
    const headers = await headersFor("/slice-simulator", null);
    expect(headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(headers.get("Content-Security-Policy")).toBe(POLICY);
  });

  it("names only route ids that exist, so moving the page cannot silently unframe it", () => {
    for (const id of CMS_FRAMED_ROUTES) {
      const dir = join("src/routes", ...id.split("/").filter(Boolean));
      expect(
        readdirSync(dir).some((file) => file.startsWith("+page.")),
        id,
      ).toBe(true);
    }
  });

  it("matches the route id exactly", () => {
    expect(isCmsFramedRoute(SIMULATOR)).toBe(true);
    expect(isCmsFramedRoute("/slice-simulator/")).toBe(false);
    expect(isCmsFramedRoute("/slice-simulator-x")).toBe(false);
    expect(isCmsFramedRoute("/slice-simulator/x")).toBe(false);
    expect(isCmsFramedRoute("/es/slice-simulator")).toBe(false);
    expect(isCmsFramedRoute(PAGE)).toBe(false);
    expect(isCmsFramedRoute(null)).toBe(false);
  });

  it("adds frame-ancestors when the policy has none", () => {
    expect(widenFrameAncestors("default-src 'self'")).toBe(
      `default-src 'self'; ${CMS_FRAME_ANCESTORS}`,
    );
  });

  it("leaves a response without a CSP without one", async () => {
    const headers = await headersFor("/slice-simulator", SIMULATOR, null);
    expect(headers.get("Content-Security-Policy")).toBeNull();
    expect(headers.get("X-Frame-Options")).toBeNull();
  });

  // Prerendered, the page is a static file: the hook never runs for it, the CSP
  // travels in a <meta> that cannot carry frame-ancestors, and netlify.toml's
  // `/*` X-Frame-Options: SAMEORIGIN reaches it (measured on vidalegacy.org
  // 2026-10-04). Server-rendered, this hook decides.
  it("server-renders /slice-simulator so the hook decides its headers", () => {
    expect(sliceSimulatorPrerender).toBe(false);
  });
});
