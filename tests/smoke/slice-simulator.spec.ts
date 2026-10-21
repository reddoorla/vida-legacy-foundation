import { test, expect } from "@playwright/test";

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

test("/slice-simulator renders a slice the Type Builder sends it", async ({ page, baseURL }) => {
  await page.route(HOST, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><iframe src="${baseURL}/slice-simulator" width="1280" height="800"></iframe>
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
        channel.port1.postMessage({ requestID: "client-slices", type: "setSliceZone", data: [${JSON.stringify(SLICE)}] });
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
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
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
  const slice = page
    .frameLocator("iframe")
    .locator('.slice-simulator--root [data-slice-type="stats_band"]');
  await expect(slice).toContainText(EYEBROW);
  await expect(slice.locator('a[href="https://example.org/"]')).toContainText(CTA);
  expect(errors).toEqual([]);
});

test("an ordinary page stays SAMEORIGIN and does not let Prismic frame it", async ({ request }) => {
  const response = await request.get("/contact");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  const policy = response.headers()["content-security-policy"] ?? "";
  expect(policy.match(/frame-ancestors[^;]*/)?.[0] ?? "").not.toContain(PRISMIC_FRAMER);
});
