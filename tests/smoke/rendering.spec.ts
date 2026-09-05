import { test, expect, type Page } from "@playwright/test";

import { HEART_ART_RATIO } from "../../src/lib/slices/HeartHero/heart";

/**
 * Invariants that must hold in EVERY rendering state, run once per project.
 *
 * See playwright.config.ts for the matrix. Nothing here sets `test.use` — the
 * project decides scripts, motion and viewport, and that is the whole point:
 * each of these was originally asserted in exactly one cell, because that is
 * where its defect happened to be found.
 *
 * Everything is polled rather than read once. With scripts on, the values these
 * assertions read are written by effects after hydration, and `load` fires well
 * before that on the dev server the suite runs against; without scripts they
 * are correct from the first paint. A single read is a race in one cell and
 * fine in the other three, which is the worst of both.
 */

const state = () => {
  const { javaScriptEnabled, viewport } = test.info().project.use;
  return {
    scripts: javaScriptEnabled !== false,
    width: viewport?.width ?? 1280,
  };
};

/** The `.reveal` wrapper's painted opacity for a page's only `<h1>`. */
async function headingOpacity(page: Page) {
  return page
    .locator("#main-content h1")
    .first()
    .evaluate((el) => {
      // Opacity is on the ancestor and does NOT inherit as a computed value, so
      // the h1's own reads 1 while it is completely invisible — and
      // `toBeVisible()` passes at opacity 0 too, since both look at the box
      // rather than the paint. `?? el` here would be a silent pass; a missing
      // wrapper must fail loudly instead.
      const box = el.closest(".reveal");
      return box ? getComputedStyle(box).opacity : null;
    });
}

for (const { path, name } of [
  { path: "/", name: "HeartHero" },
  { path: "/es", name: "HeartHero (es)" },
  { path: "/about", name: "PageMasthead" },
]) {
  test(`${path} paints its only heading (${name})`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const h1 = page.locator("#main-content h1").first();
    await expect(h1, `no <h1> rendered on ${path}`).toBeAttached();

    await expect
      .poll(() => headingOpacity(page), {
        message: `no .reveal wrapper around the <h1> on ${path} — check the selector`,
      })
      .not.toBeNull();
    await expect
      .poll(() => headingOpacity(page), {
        message: `the only <h1> on ${path} is invisible in this rendering state`,
      })
      .toBe("1");
  });

  test(`${path} does not leave a scroll runway (${name})`, async ({ page }) => {
    // Both stages are 260vh runways driven by scroll progress that only
    // JavaScript computes. Left at frame 0 that is two and a half screens of
    // one unchanging frame, with the page's copy at opacity 0 above it.
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect
      .poll(
        () =>
          page
            .locator("#main-content > section")
            .first()
            .evaluate((el) => el.getBoundingClientRect().height / window.innerHeight),
        { message: `${path} still renders a scroll runway` },
      )
      .toBeLessThan(1.2);
  });
}

test("/ opens the heart far enough to cover the band", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });

  // Measured from the resolved `mask-size`, which the two halves of the site
  // express differently and deliberately:
  //
  //   with scripts     `<pct>% auto`      — a percentage of the stage's WIDTH,
  //                                         which only a ResizeObserver knows
  //   without scripts  `auto 273.4919%`   — the same heart as a multiple of the
  //                                         positioning area's HEIGHT
  //
  // CLAUDE.md argues those are algebraically identical at every aspect. This is
  // the only thing that measures it in a browser, and it could not before:
  // parsing the first token as a width is a NaN on the no-JS form.
  await expect
    .poll(
      () =>
        page.locator(".heart-hero").evaluate((section, ratio) => {
          const mask = section.querySelector(".heart-mask") as HTMLElement | null;
          const stage = section.querySelector(".heart-hero-stage") as HTMLElement | null;
          if (!mask || !stage) return null;
          const band = section.getBoundingClientRect();
          const box = mask.getBoundingClientRect();

          const [first, second = "auto"] = getComputedStyle(mask).maskSize.split(/\s+/);
          const resolve = (token: string, basis: number) =>
            token === "auto"
              ? null
              : token.endsWith("%")
                ? (parseFloat(token) / 100) * basis
                : parseFloat(token);
          let w = resolve(first, box.width);
          let h = resolve(second, box.height);
          if (w === null && h !== null) w = h * ratio;
          if (h === null && w !== null) h = w / ratio;
          if (w === null || h === null) return null;

          return {
            // The root cause of the reduced-motion phone bug, asserted
            // directly: `height: 100%` against a band that only has a
            // min-height computes to `auto`, every child is absolutely
            // positioned, and the box collapses to zero — so there is
            // nothing for heartEndPct to measure and it falls back to the
            // comp's 187.2%, which on a phone leaves the heart's cleft and
            // point on screen with green around them.
            stageCollapsed: stage.getBoundingClientRect().height === 0,
            coversWidth: w >= band.width,
            coversHeight: h >= band.height,
          };
        }, HEART_ART_RATIO),
      { message: "the open heart never covered the band" },
    )
    .toMatchObject({ stageCollapsed: false, coversWidth: true, coversHeight: true });
});

test("/about gives PageMasthead's stage a height", async ({ page }) => {
  // Same shape as the heart's collapsed stage, same media query. Nothing reads
  // this box today, so nothing renders wrong — which is exactly why it needs a
  // test: the next thing to measure it would inherit a zero silently.
  await page.goto("/about", { waitUntil: "load" });
  await expect
    .poll(
      () =>
        page.locator(".page-masthead-stage").evaluate((el) => el.getBoundingClientRect().height),
      { message: "the masthead stage collapsed to nothing" },
    )
    .toBeGreaterThan(0);
});

test("/ shows the real stat figures, not the count's starting zeros", async ({ page }) => {
  // CountUp's visible layer is a tween that starts at `startValue` and is run
  // by onMount, so with no script the band read "0+", "0 people", "0%",
  // "0 lives" — not unanimated but WRONG, while the sr-only sibling carried
  // the truth all along, which is why nothing in the suite could see it.
  await page.goto("/", { waitUntil: "load" });
  const figures = () =>
    page.locator('[data-slice-type="stats_band"] [aria-hidden="true"]').evaluateAll((els) =>
      els
        .filter((el) => getComputedStyle(el).display !== "none")
        .map((el) => (el.textContent ?? "").trim())
        .filter(Boolean),
    );

  await expect
    .poll(figures, { message: "no stat figures found — check the selector" })
    .not.toHaveLength(0);
  // Polled because with scripts the tween genuinely passes through zero on its
  // way to the real number; the assertion is about where it comes to rest.
  await expect
    .poll(async () => (await figures()).filter((f) => /^0\b/.test(f)), {
      message: "stats still reading zero",
    })
    .toEqual([]);
});

test("/ paints one figure per stat, not both candidates", async ({ page }) => {
  // The other half of the coupling. CountUp renders `.countup-live` and
  // `.countup-nojs`, both aria-hidden, and app.css plus the <noscript><style>
  // in app.html decide which one paints. A class name that drifts out of step
  // with either shows every visitor "100,000+ 100,000+" without tripping axe,
  // a type error or a console warning.
  //
  // Counted by what is PAINTED, not by class name: naming `.countup-nojs` in
  // the selector passed the mutation happily, because a renamed class simply
  // stopped matching, so the test measured one element and found one.
  await page.goto("/", { waitUntil: "load" });
  const roots = page.locator('[data-slice-type="stats_band"] .countup-live');
  expect(await roots.count(), "no CountUp in the stats band — check the selector").toBeGreaterThan(
    0,
  );

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

test("a card shows exactly one bio, whichever half of the coupling is live", async ({ page }) => {
  // /about carries no bios today (the board members have none, the leadership
  // cards open on `!board` alone), so the fixtures page is the only rendered
  // bio on the site.
  //
  // The two halves are opposites — with scripts the bio belongs to the pop-up
  // alone and `.person-bio-nojs` is display:none, which also keeps it out of
  // the accessibility tree; without scripts the pop-up cannot open and the
  // inline bio is the only copy there is. So the invariant is not "shown" or
  // "hidden", it is that exactly one of the two is reachable, and it is stated
  // that way here so it can run in every cell rather than twice with opposite
  // expectations.
  const { scripts } = state();
  await page.goto("/dev/a11y-fixtures", { waitUntil: "load" });
  const bios = page.locator(".person-bio-nojs");
  expect(await bios.count(), "the fixtures page no longer renders a bio").toBeGreaterThan(0);

  await expect
    .poll(
      () =>
        bios.evaluateAll(
          (els) => els.filter((el) => getComputedStyle(el).display !== "none").length,
        ),
      {
        message: scripts
          ? "a card bio is visible even though the pop-up can open it"
          : "no bio revealed on a card that has no other way to show one",
      },
    )
    .toBe(scripts ? 0 : await bios.count());
});
