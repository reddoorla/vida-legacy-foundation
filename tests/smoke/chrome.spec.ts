import { test, expect } from "@playwright/test";

/**
 * Accessibility-tree snapshots of the chrome, one per route.
 *
 * `toMatchAriaSnapshot` writes a YAML outline of roles and accessible names —
 * text, reviewable in a diff, and stable across machines. That last part is why
 * this is worth having where a pixel baseline is not: font rasterisation
 * differs between macOS and CI's Linux, so screenshot baselines need either a
 * container or a tolerance, and both turn a regression check into a chore.
 *
 * The chrome is the right target rather than the whole page. It is written by
 * CODE, not by Prismic, so a diff here is a change somebody made rather than a
 * change an author published — and it is exactly the layer where this site
 * shipped English to Spanish readers three separate times, in three different
 * rounds, each found by eye. `$lib/ui-copy` is the fix; this is what would have
 * caught it.
 *
 * Regenerate deliberately, never reflexively:
 *
 *     npx playwright test tests/smoke/chrome.spec.ts --update-snapshots
 *
 * and read the diff. An accessible name that changed language, a link that
 * became a span, a heading that lost its level are all real defects that look
 * exactly like a snapshot needing an update.
 */

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/es", name: "home-es" },
  { path: "/about", name: "about" },
  { path: "/es/about", name: "about-es" },
  { path: "/donate", name: "donate" },
  { path: "/es/donate", name: "donate-es" },
  { path: "/contact", name: "contact" },
  { path: "/es/contact", name: "contact-es" },
];

for (const { path, name } of ROUTES) {
  test(`${path} renders the same navigation tree`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    // The bar itself, not the menu: the open menu is not in the DOM until it is
    // opened, and the fixtures page is where its colours are put in front of
    // axe. What this holds is the skip link, the lockup's accessible name, the
    // nav links, and the EN | ES control — whose other side is a link only when
    // the target page exists in that locale, and an inert label otherwise. That
    // distinction is invisible in a screenshot and is one node here.
    await expect(page.locator("nav").first()).toMatchAriaSnapshot({
      name: `nav-${name}.aria.yml`,
    });
  });
}

for (const { path, name } of [
  { path: "/", name: "en" },
  { path: "/es", name: "es" },
]) {
  test(`the footer reads in the right language (${name})`, async ({ page }) => {
    // Per locale rather than per route: the footer renders from
    // site-config.json through +layout.svelte and is identical across a
    // locale's routes. Two files, not eight.
    await page.goto(path, { waitUntil: "load" });
    await expect(page.locator("footer").first()).toMatchAriaSnapshot({
      name: `footer-${name}.aria.yml`,
    });
  });
}
