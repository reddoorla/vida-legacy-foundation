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
  // Turnstile (Cloudflare) telemetry occasionally surfaces in console — a 403
  // from a cloud IP, a beacon that didn't land. Console-level ONLY: see
  // ALLOWED_PAGEERROR_PATTERNS below for why this does not extend to throws.
  /turnstile|challenges\.cloudflare/i,
];

// Uncaught exceptions are held to a stricter bar than console noise, and
// Turnstile is deliberately NOT on this list. A widget whose sitekey is not
// allowlisted for the hostname it is served from throws an uncaught
// `TurnstileError: [Cloudflare Turnstile] Error: 110200` and mints no token at
// all — which on a `Require Turnstile` site buckets 100% of real leads as spam.
// It shipped that way once (2026-09-04) and this suite watched it happen: the
// pattern above matched the throw's message and the run stayed green. Telemetry
// that merely logs is noise; a widget that THROWS is the failure itself.
const ALLOWED_PAGEERROR_PATTERNS: RegExp[] = [/vimeo/i];

function attachConsoleWatcher(page: Page, extraAllowed: RegExp[] = []) {
  const errors: string[] = [];
  const allowed = [...ALLOWED_CONSOLE_PATTERNS, ...extraAllowed];
  const allowedThrows = [...ALLOWED_PAGEERROR_PATTERNS, ...extraAllowed];
  const isAllowed = (s: string) => !!s && allowed.some((re) => re.test(s));
  const isAllowedThrow = (s: string) => !!s && allowedThrows.some((re) => re.test(s));

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    const url = msg.location()?.url ?? "";
    if (isAllowed(text) || isAllowed(url)) return;
    errors.push(`[console.error] ${text}${url ? ` (${url})` : ""}`);
  });

  page.on("pageerror", (err) => {
    if (isAllowedThrow(err.message)) return;
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
      // Exactly one of each. Two is the head being emitted twice; zero is a
      // page that forgot its description, which /contact did until it was
      // given one of its own (DEFAULT_DESCRIPTION is deliberately empty).
      await expect(
        page.locator('head link[rel="canonical"]'),
        `canonical links on ${route.path}`,
      ).toHaveCount(1);
      await expect(
        page.locator('head meta[name="description"]'),
        `description meta tags on ${route.path}`,
      ).toHaveCount(1);
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

// What is left here is the half of the no-JS work that is genuinely ONE-SIDED:
// a control that cannot function must be hidden, and a card must be able to
// grow around a bio it is now the only home for. Neither has a meaningful
// with-scripts counterpart.
//
// The invariants that hold in every rendering state — the heading is painted,
// the runway is not 260vh, the stats are not zeros, one figure per stat, one
// bio per card — moved to tests/smoke/rendering.spec.ts, where the projects in
// playwright.config.ts run them in four cells instead of the single cell each
// was discovered in.
test.describe("without JavaScript", () => {
  // Scripts off AND reduced motion off. The shared config forces
  // `reducedMotion: "reduce"` on every test, and that alone collapses both
  // runway stages through the components' own media query — so a no-JS test
  // that inherits it can pass against a page with no fix at all.
  test.use({
    javaScriptEnabled: false,
    contextOptions: { reducedMotion: "no-preference" },
  });

  test("lets the card grow to hold a bio, instead of clipping it", async ({ page }) => {
    await page.goto("/dev/a11y-fixtures", { waitUntil: "domcontentloaded" });
    // The leadership card is `aspect-square` over `overflow: hidden`, so its
    // height comes from its column width and content cannot grow it — a real
    // multi-sentence bio was cut off with no sign it was there. Measured: 166px
    // of it hidden. The fixture's own bio is one line and fits by luck, so the
    // test writes a realistic one before measuring.
    const hidden = await page.evaluate(() => {
      const long =
        "Fifteen years coordinating transplant services across South Texas, " +
        "and the founder of the family-support programme VLF still runs today. " +
        "She speaks regularly on donor family advocacy throughout the region.";
      document.querySelectorAll(".person-bio-nojs p").forEach((el) => (el.textContent = long));
      return [...document.querySelectorAll(".person-bio-nojs")].map((bio) => {
        const card = bio.closest("li");
        if (!card) return -1;
        return Math.max(
          0,
          Math.round(bio.getBoundingClientRect().bottom - card.getBoundingClientRect().bottom),
        );
      });
    });
    expect(hidden.length, "no bios rendered — check the fixture").toBeGreaterThan(0);
    expect(hidden, "a bio is clipped off the bottom of its card").toEqual(hidden.map(() => 0));
  });

  test("/about hides the controls that cannot open a bio", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    // The overlay button does nothing without a script and would swallow
    // selection of the bio beneath it; the + badge promises a pop-up that
    // cannot happen. Same treatment as the nav's hamburger.
    for (const selector of ["[data-bio-toggle]", ".person-open-cue"]) {
      const all = page.locator(selector);
      // A floor first: "none are showing" is also true of a selector that
      // matches nothing, so a rename would retire the guard silently.
      expect(
        await all.count(),
        `${selector} matches nothing — has it been renamed?`,
      ).toBeGreaterThan(0);
      const shown = await all.evaluateAll(
        (els) => els.filter((el) => getComputedStyle(el).display !== "none").length,
      );
      expect(shown, `${selector} still showing without scripts`).toBe(0);
    }
  });
});
