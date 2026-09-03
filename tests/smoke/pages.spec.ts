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

// The two runway stages open on scroll progress that only a script computes,
// so without one they render frame 0: a green field with the photograph in its
// closed shape and the page's only <h1> at opacity 0. The text is in the
// markup, so a crawler and a screen reader are fine and nothing else in the
// suite can see the problem — this is measured from the rendered box.
//
// The <noscript><style> in src/app.html is what fixes it, and app-html.test.ts
// holds its shape. This holds the thing that actually matters: a visitor with
// no scripts can read the page.
test.describe("without JavaScript", () => {
  // Scripts off AND reduced motion off. The shared config forces
  // `reducedMotion: "reduce"` on every test, and that alone collapses both
  // runways through the components' own media query — so the runway assertion
  // below would pass on a page with no fix at all. (The opacity assertion is
  // real either way: neither reduced-motion block ever sets opacity, so the
  // copy stays hidden. It only LOOKED vacuous at first because it was reading
  // the h1 instead of its .reveal wrapper.)
  test.use({
    javaScriptEnabled: false,
    contextOptions: { reducedMotion: "no-preference" },
  });

  for (const { path, name } of [
    { path: "/", name: "HeartHero" },
    { path: "/about", name: "PageMasthead" },
    { path: "/es", name: "HeartHero (es)" },
  ]) {
    test(`${path} shows its heading and does not leave a runway (${name})`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });

      const h1 = page.locator("#main-content h1").first();
      await expect(h1, `no <h1> rendered on ${path}`).toBeAttached();

      // The opacity is on the .reveal ANCESTOR, and opacity does not inherit
      // as a computed value — getComputedStyle(h1).opacity reads 1 even while
      // the heading is completely invisible, and toBeVisible() passes at
      // opacity 0 too, since both look at the box rather than the paint. Ask
      // the element that actually carries it.
      // `?? el` would be a silent pass: opacity does not inherit as a computed
      // value, so the h1's own is 1 whatever its wrapper does. If the .reveal
      // ancestor ever moves, this must fail loudly rather than read the wrong
      // element — hence the null, and the assertion on it.
      const painted = await h1.evaluate((el) => {
        const box = el.closest(".reveal");
        return box ? getComputedStyle(box).opacity : null;
      });
      expect(
        painted,
        `no .reveal wrapper around the <h1> on ${path} — check the selector`,
      ).not.toBeNull();
      expect(painted, `the only <h1> on ${path} is invisible without scripts`).toBe("1");

      // And the band must not still be the 260vh runway: with nothing to drive
      // it, that is two and a half screens of one unchanging frame.
      const runway = await page
        .locator("#main-content > section")
        .first()
        .evaluate((el) => el.getBoundingClientRect().height / window.innerHeight);
      expect(runway, `${path} still renders a scroll runway without scripts`).toBeLessThan(1.2);
    });
  }
});

// The reduced-motion phone frame. Its heart is sized from a MEASUREMENT of the
// stage, and the stage's `height: 100%` resolved against a band that has only
// a min-height here — indefinite, so it computed to auto and, every child
// being absolutely positioned, the box collapsed to zero. heartEndPct read 0
// and fell back to the comp's 187.2%, which does not cover a phone: the
// heart's cleft and point were both on screen with green around them.
//
// Nothing else in the suite can see this. The rule is gated on reduced motion
// AND width < 768, and every other test runs at the config's 1280x720.
test.describe("the reduced-motion phone frame", () => {
  test.use({ viewport: { width: 390, height: 664 } });

  test("opens the heart far enough to cover the band", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });

    // Polled, not measured once: the size is written by an effect after
    // hydration, and `load` fires well before that on the dev server the suite
    // runs against — a single read returns the server's closed frame and fails
    // for the wrong reason.
    await expect
      .poll(
        () =>
          page.locator(".heart-hero").evaluate((section) => {
            const stage = section.querySelector(".heart-hero-stage") as HTMLElement;
            const mask = section.querySelector(".heart-mask") as HTMLElement;
            const band = section.getBoundingClientRect();
            const box = mask.getBoundingClientRect();
            // The mask is a percentage of its own box's width, and the art
            // keeps the file's aspect — heart.ts's HEART_ART_RATIO.
            const size = getComputedStyle(mask).maskSize;
            const artW = size.includes("%")
              ? (parseFloat(size) / 100) * box.width
              : parseFloat(size);
            return {
              // The root cause, asserted directly: with no height on the stage
              // there is nothing for heartEndPct to read.
              stageCollapsed: stage.getBoundingClientRect().height === 0,
              coversWidth: artW >= band.width,
              coversHeight: artW / (669.436 / 584) >= band.height,
            };
          }),
        { message: "the open heart never covered the band on a reduced-motion phone" },
      )
      .toMatchObject({ stageCollapsed: false, coversWidth: true, coversHeight: true });
  });
});
