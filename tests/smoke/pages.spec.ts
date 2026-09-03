import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import { smokeRoutes } from "./routes";

// Console messages we don't care about. Add patterns here only after seeing them
// in CI and confirming they aren't actionable. Patterns are matched against both
// the message text and the offending resource URL — Chromium's "Failed to load
// resource" text omits the URL, so URL matching catches third-party network noise.
const ALLOWED_CONSOLE_PATTERNS: RegExp[] = [
  // Vimeo iframe embeds + their CDN telemetry endpoints occasionally 403 from
  // cloud IPs due to bot detection.
  /vimeo/i,
  // Turnstile (Cloudflare) telemetry occasionally surfaces in console.
  /turnstile|challenges\.cloudflare/i,
];

function attachConsoleWatcher(page: Page, extraAllowed: RegExp[] = []) {
  const errors: string[] = [];
  const allowed = [...ALLOWED_CONSOLE_PATTERNS, ...extraAllowed];
  const isAllowed = (s: string) => !!s && allowed.some((re) => re.test(s));

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    const url = msg.location()?.url ?? "";
    if (isAllowed(text) || isAllowed(url)) return;
    errors.push(`[console.error] ${text}${url ? ` (${url})` : ""}`);
  });

  page.on("pageerror", (err) => {
    if (isAllowed(err.message)) return;
    errors.push(`[pageerror] ${err.message}`);
  });

  return errors;
}

for (const route of smokeRoutes) {
  test(`${route.path} (${route.name}) loads with no console errors`, async ({ page }) => {
    const expectedStatus = route.expectStatus ?? 200;
    // A route whose expected status IS an error (e.g. "/" on the placeholder
    // starter, see tests/smoke/routes.ts) makes the browser log "Failed to
    // load resource: ... <status>" for the document itself — expected, not a
    // bug. Same allowance as the dedicated 404-page test below.
    const errors = attachConsoleWatcher(
      page,
      expectedStatus >= 400 ? [new RegExp(`Failed to load resource.*${expectedStatus}`, "i")] : [],
    );
    const response = await page.goto(route.path, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status(), `HTTP status for ${route.path}`).toBe(expectedStatus);
    if (route.hydrationMarker) {
      await expect(
        page.locator(route.hydrationMarker),
        `hydration marker "${route.hydrationMarker}" on ${route.path}`,
      ).toBeVisible();
    }
    expect(errors, `console errors on ${route.path}`).toEqual([]);

    // The template's own placeholders must be gone by the time a browser sees
    // the page, and the head must be emitted once. Both failed for an
    // afternoon because a comment in app.html mentioned `%sveltekit.head%` in
    // prose: SvelteKit substitutes the FIRST occurrence and only the first, so
    // the comment took the whole head — and the injected markup carries
    // Svelte's `<!--]-->` hydration marker, whose terminator closed that
    // comment early. The sentence after it became visible text at the top of
    // every page, the real placeholder rendered literally, and the head went
    // out in the wrong place. None of it is a console error, an axe violation
    // or a type error, so nothing in the suite noticed.
    const body = await page.evaluate(() => document.body.innerText);
    expect(body, `unsubstituted template placeholder on ${route.path}`).not.toMatch(
      /%sveltekit\.|%lang%/,
    );
    // Head tags loose in the body mean the head was emitted somewhere it
    // should not have been — which is what a comment in app.html swallowing
    // the placeholder looks like from out here. This is the assertion that
    // catches it whatever the prose says; the placeholder check above only
    // catches the variant where the literal survives.
    await expect(
      page.locator("body meta, body link[rel=canonical], body link[rel=alternate], body title"),
      `head tags loose in the body on ${route.path}`,
    ).toHaveCount(0);
    if (expectedStatus < 400) {
      // At most one of each: the head being emitted TWICE is the failure mode
      // this guards. (/contact has no description at all — DEFAULT_DESCRIPTION
      // is empty and the route sets none. That is a content gap, not this bug.)
      await expect(
        page.locator('head link[rel="canonical"]'),
        `canonical links on ${route.path}`,
      ).toHaveCount(1);
      expect(
        await page.locator('head meta[name="description"]').count(),
        `description meta tags on ${route.path}`,
      ).toBeLessThanOrEqual(1);
    }
  });
}

test("404 page renders the custom error component", async ({ page }) => {
  // The browser logs a top-level "Failed to load resource: 404" for the page
  // itself — expected on a 404 route, not a bug. Allow it here.
  const errors = attachConsoleWatcher(page, [/Failed to load resource.*404/i]);
  const response = await page.goto("/this-uid-does-not-exist", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(404);
  // src/routes/+error.svelte renders `<h1>{page.status}</h1>` → "404".
  // Scoped to the rendered page: <title> is "404 — …" too, and an unscoped
  // getByText picks that up first and calls it hidden. It only passed before
  // because the head was going out broken, which is the bug this run fixes.
  await expect(page.locator("#main-content h1", { hasText: "404" })).toBeVisible();
  expect(errors).toEqual([]);
});
