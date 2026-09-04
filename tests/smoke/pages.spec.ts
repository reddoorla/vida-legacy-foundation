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
  test("/ shows the real figures, not the count's starting zeros", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // CountUp's visible layer is a tween starting at 0 that no script runs, so
    // the band read "0+", "0 people", "0%", "0 lives" — not merely unanimated
    // but wrong. The sr-only layer always carried the truth, which is exactly
    // why nothing else in the suite could see this.
    const figures = await page
      .locator('[data-slice-type="stats_band"] [aria-hidden="true"]')
      .evaluateAll((els) =>
        els
          .filter((el) => getComputedStyle(el).display !== "none")
          .map((el) => (el.textContent ?? "").trim())
          .filter(Boolean),
      );
    expect(figures.length, "no stat figures found — check the selector").toBeGreaterThan(0);
    expect(
      figures.some((f) => /^0\b/.test(f)),
      `stats still reading zero: ${figures}`,
    ).toBe(false);
  });

  test("shows a person's bio on the card, where one is written", async ({ page }) => {
    // /about carries no bios today (the board members have none, the
    // leadership cards open on `!board` alone), so the fixtures page is the
    // only rendered bio on the site — and the only thing that can catch the
    // regression that matters here: a class name that stops matching app.css,
    // which would leave the bio visible for EVERY visitor, duplicated with the
    // pop-up, without tripping axe or a type error.
    await page.goto("/dev/a11y-fixtures", { waitUntil: "domcontentloaded" });
    await expect
      .poll(
        () =>
          page
            .locator(".person-bio-nojs")
            .evaluateAll(
              (els) => els.filter((el) => getComputedStyle(el).display !== "none").length,
            ),
        { message: "no bio revealed without scripts" },
      )
      .toBeGreaterThan(0);
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

  test("gives PageMasthead's stage a height too", async ({ page }) => {
    // Same shape, same media query. Nothing reads this box today, so nothing
    // renders wrong — which is exactly why it needs a test: the next thing to
    // measure it would inherit a zero silently, as HeartHero's heart did.
    await page.goto("/about", { waitUntil: "load" });
    await expect
      .poll(
        () =>
          page.locator(".page-masthead-stage").evaluate((el) => el.getBoundingClientRect().height),
        { message: "the masthead stage collapsed to nothing" },
      )
      .toBeGreaterThan(0);
  });
});

test("a card's bio stays hidden while the pop-up can open it", async ({ page }) => {
  // The other half of the coupling above. With scripts the bio belongs to the
  // pop-up alone; display:none also keeps it out of the accessibility tree, so
  // nobody is read it twice.
  await page.goto("/dev/a11y-fixtures", { waitUntil: "load" });
  const bios = page.locator(".person-bio-nojs");
  expect(await bios.count(), "the fixtures page no longer renders a bio").toBeGreaterThan(0);
  // Polled: the suite runs against a dev server, where app.css can land after
  // `load`, so a single read catches the moment before the rule applies and
  // fails for the wrong reason. A class name that never matches still fails —
  // it just takes the timeout to do it.
  await expect
    .poll(
      () =>
        bios.evaluateAll(
          (els) => els.filter((el) => getComputedStyle(el).display !== "none").length,
        ),
      { message: "a card bio is visible even though scripts can open the pop-up" },
    )
    .toBe(0);
});

test("a stat paints one figure, not both of its candidates", async ({ page }) => {
  // The CountUp half of the same coupling. A class name that drifts out of
  // step with app.css leaves both layers painted — "100,000+ 100,000+" on
  // every stat — and NOTHING else sees it: the unit suite stays green, and so
  // do the no-JS tests, because with no script the noscript rule hides
  // .countup-live and the renamed layer is the only thing showing. It only
  // breaks with scripts ON, which is every real visitor. This was not a
  // hypothetical; a renamed class reached a commit on this branch.
  await page.goto("/", { waitUntil: "load" });
  const band = page.locator('[data-slice-type="stats_band"]');
  const roots = band.locator(".countup-live");
  expect(await roots.count(), "no CountUp in the stats band — check the selector").toBeGreaterThan(
    0,
  );

  // Counted by what is PAINTED, not by class name. Naming `.countup-nojs` in
  // the selector was the first attempt and it passed the mutation happily: a
  // renamed class simply stopped matching, so the test measured one element
  // and found one. Every candidate is an aria-hidden child of the same
  // wrapper, so counting those catches a rename to anything at all.
  await expect
    .poll(
      () =>
        roots.evaluateAll((els) =>
          els.map(
            (live) =>
              [...(live.parentElement?.children ?? [])].filter(
                (c) =>
                  c.getAttribute("aria-hidden") === "true" &&
                  getComputedStyle(c).display !== "none",
              ).length,
          ),
        ),
      { message: "a stat is painting more than one figure" },
    )
    .toEqual(await roots.evaluateAll((els) => els.map(() => 1)));
});
