import { test, expect, type Page } from "@playwright/test";

const PRISMIC_FRAMER = "https://*.prismic.io";

for (const path of ["/slice-simulator", "/slice%2Dsimulator", "/slice%2dsimulator"]) {
  test(`${path} lets Prismic frame it`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["x-frame-options"]).toBeUndefined();
    const policy = response.headers()["content-security-policy"] ?? "";
    expect(policy.match(/frame-ancestors[^;]*/)?.[0]).toContain(PRISMIC_FRAMER);
  });
}

// The Type Builder frames /slice-simulator from an https://*.prismic.io page
// and sends it slices through @prismicio/simulator's channel. Outside
// development the simulator accepts that handshake only from Prismic's own
// https origins (*.prismic.io, *.wroom.io and a few more), so the host page is
// served at a prismic.io URL that Playwright answers itself. `vite dev`, which
// this suite runs against, skips that origin check; a production build
// enforces it.
// The handshake mirrors the library's ChannelEmitter: the frame posts `ready`,
// the host answers with `connect` and a MessagePort, acknowledges `ready`, then
// sends `setSliceZone` over the port.
const HOST = "https://simulator-smoke.prismic.io/";
const EYEBROW = "Simulator smoke eyebrow";
// A filled CTA renders through @prismicio/svelte's PrismicLink.
const CTA = "Simulator smoke CTA";
const SLICE = {
  id: "stats_band$smoke",
  slice_type: "stats_band",
  slice_label: null,
  variation: "default",
  version: "initial",
  primary: {
    eyebrow: EYEBROW,
    cta_label: CTA,
    cta_link: { link_type: "Web", url: "https://example.org/", key: "smoke" },
  },
  // The CTA hangs off the last figure, so it needs one.
  items: [{ value: 13, suffix: "people", description: "Simulator smoke figure" }],
};

/**
 * Opens /slice-simulator in a frame `width` px wide on the Prismic host page
 * and sends it `slices`; resolves once the frame acknowledges them.
 */
async function simulate(page: Page, baseURL: string | undefined, slices: unknown[], width = 1280) {
  await page.route(HOST, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><style>body{margin:0}iframe{border:0;display:block}</style><iframe src="${baseURL}/slice-simulator" width="${width}" height="800"></iframe>
<script>
  const frame = document.querySelector("iframe");
  const ok = (requestID) => ({ requestID, status: 200, msg: "ok", data: undefined });
  addEventListener("message", (event) => {
    if (event.source !== frame.contentWindow || event.data?.type !== "ready") return;
    const ready = event.data.requestID;
    const channel = new MessageChannel();
    channel.port1.onmessage = ({ data }) => {
      if (data.requestID === "emitter-connect") {
        frame.contentWindow.postMessage(ok(ready), "*");
        channel.port1.postMessage({ requestID: "client-slices", type: "setSliceZone", data: ${JSON.stringify(slices)} });
      } else if (data.requestID === "client-slices") {
        window.setSliceZoneStatus = data.status;
      } else if (data.type) {
        channel.port1.postMessage(ok(data.requestID));
      }
    };
    frame.contentWindow.postMessage({ requestID: "emitter-connect", type: "connect", data: { activeSliceAPI: true, sliceZoneSizeAPI: true } }, "*", [channel.port2]);
  });
</script>`,
    }),
  );
  // Chrome's Local Network Access check blocks a public origin from framing
  // localhost unless the browser has granted that origin the permission.
  await page.context().grantPermissions(["local-network-access"], { origin: new URL(HOST).origin });
  await page.goto(HOST);
  await expect
    .poll(
      () => page.evaluate(() => (window as { setSliceZoneStatus?: number }).setSliceZoneStatus),
      { timeout: 25_000 },
    )
    .toBe(200);
}

test("/slice-simulator renders a slice the Type Builder sends it", async ({ page, baseURL }) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  await simulate(page, baseURL, [SLICE]);
  const slice = page
    .frameLocator("iframe")
    .locator('.slice-simulator--root [data-slice-type="stats_band"]');
  await expect(slice).toContainText(EYEBROW);
  await expect(slice.locator('a[href="https://example.org/"]')).toContainText(CTA);
  expect(errors).toEqual([]);
});

// MediaText's variation is the editor's choice of side: wherever the layout
// has two columns, "Image left" puts the photo left of the copy and "Image
// right" puts it right. Only a browser's cascade can answer that (a
// hand-written media query evaluator in vitest returned false greens for
// `not-*` variants and nested `@media`, review 3), so this reads where the two
// columns are painted, relative to each other. No class, order value or px is
// named: any markup or CSS that keeps the photo on the chosen side passes. One
// slice per load, because app.css alternates the sides on even media_text rows.
//
// Which widths have two columns is the designer's call (the split is `lg:`
// today), so no width below the widest is required to have them. The frame is
// resized from 1920px down, and at each width the photo must be on the chosen
// side or the layout stacked; only at 1920, wider than any breakpoint the
// band's 72rem content could split at, must there be columns, which also proves
// the stylesheet has applied before the narrower reads accept "stacked". A
// wrong side at any width is red, so `xl:order-2` (wrong between 1024 and
// 1279px) fails at 1024 while moving the whole split to `xl` passes.
//
// The read uses getBoundingClientRect, which "`@smoke` is earned" bans in the
// gate as `boundingBox`. The rule exists to keep px out of the gate, and this
// compares only which column's left edge comes first; no position or size is
// asserted, and a gap change passes. This file has no `@smoke` tag: every spec
// under tests/smoke runs in `pnpm test`, and nothing here selects on the tag.
const MEDIA_TEXT = (variation: "imageLeft" | "imageRight") => ({
  id: `media_text$${variation}`,
  slice_type: "media_text",
  slice_label: null,
  variation,
  version: "initial",
  primary: {
    heading: [{ type: "heading2", text: "Simulator smoke heading", spans: [] }],
    body: [{ type: "paragraph", text: "Simulator smoke body.", spans: [] }],
    media: {
      url: "https://images.prismic.io/vida-legacy-foundation/simulator-smoke.jpg",
      alt: "Simulator smoke photo",
      dimensions: { width: 800, height: 600 },
      edit: { x: 0, y: 0, zoom: 1, background: "transparent" },
      id: "smoke",
      copyright: null,
    },
  },
  items: [],
});

// The photo is on Prismic's image host, which the CSP allows, and never loads:
// the column tracks do not depend on its size.
const WIDTHS = [1920, 1440, 1280, 1024];

for (const variation of ["imageLeft", "imageRight"] as const) {
  test(`MediaText ${variation} never puts the photo on the other side`, async ({
    page,
    baseURL,
  }) => {
    await page.route("https://images.prismic.io/**", (route) => route.abort());
    await page.setViewportSize({ width: 2000, height: 900 });
    await simulate(page, baseURL, [MEDIA_TEXT(variation)]);
    const frame = page.frameLocator("iframe");
    const section = frame.locator('.slice-simulator--root [data-slice-type="media_text"]');
    await expect(section).toHaveCount(1);
    const chosen = variation === "imageLeft" ? "photo left" : "photo right";
    for (const width of WIDTHS) {
      await page.locator("iframe").evaluate((el, w) => {
        (el as HTMLIFrameElement).width = String(w);
      }, width);
      await expect
        .poll(
          () =>
            section.evaluate((el, w) => {
              if (el.ownerDocument.defaultView!.innerWidth !== w) return "frame not resized";
              const img = el.querySelector("img");
              const heading = el.querySelector("h2");
              if (!img || !heading) return "photo or heading missing";
              // The column each sits in: the ancestor whose parent also
              // holds the other.
              const column = (node: Element, other: Element) => {
                let n = node;
                while (n.parentElement && !n.parentElement.contains(other)) n = n.parentElement;
                return n.getBoundingClientRect();
              };
              const photo = column(img, heading);
              const copy = column(heading, img);
              if (photo.left < copy.left) return "photo left";
              if (photo.left > copy.left) return "photo right";
              return "stacked";
            }, width),
          { message: `${variation} at a ${width}px frame` },
        )
        .toMatch(width === WIDTHS[0] ? chosen : new RegExp(`^(${chosen}|stacked)$`));
    }
  });
}

test("an ordinary page stays SAMEORIGIN and does not let Prismic frame it", async ({ request }) => {
  const response = await request.get("/contact");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  const policy = response.headers()["content-security-policy"] ?? "";
  expect(policy.match(/frame-ancestors[^;]*/)?.[0] ?? "").not.toContain(PRISMIC_FRAMER);
});
