import { devices, type PlaywrightTestConfig } from "@playwright/test";
import base from "@reddoorla/maintenance/configs/playwright-a11y";

/**
 * The fleet config, plus a rendering-state matrix.
 *
 * Every no-JS and reduced-motion-phone defect this site has shipped was found
 * by hand, and the test written for it then lived in the one cell where it was
 * discovered — a `test.describe` with its own `test.use`. So the heart-covers
 * check ran only at 390x664, the stats-are-not-zero check only without scripts,
 * and the heading-is-visible check only on the desktop no-JS page. Each was a
 * true statement about every rendering state and was asserted in one.
 *
 * `tests/smoke/rendering.spec.ts` holds those invariants with no `test.use` of
 * its own, and the projects below run it in four cells. Everything else stays
 * in the `chromium` project exactly as before.
 *
 * The matrix is {desktop, phone} x {scripts + reduced motion, no scripts + full
 * motion} — deliberately not all four combinations of those axes. A visitor
 * with scripts and full motion sees frame 0 of the hero for two seconds by
 * design (the runway opens itself), so "the heading is painted" is not true of
 * that state on arrival and asserting it would be wrong rather than strict.
 *
 * `contextOptions.reducedMotion` must sit under `contextOptions` — it is a
 * BrowserContextOptions member, and Playwright silently drops it from the top
 * level of `use`. The fleet config carries the same note; it was inert there
 * for three months.
 */
const RENDERING_INVARIANTS = /rendering\.spec\.ts$/;

const desktop = devices["Desktop Chrome"];
const phone = { ...desktop, viewport: { width: 390, height: 664 } };

// Scripts off AND reduced motion off. Both halves matter: the shared config
// emulates reduced motion fleet-wide, and that alone collapses both runway
// stages through the components' own media query — so a no-JS test that
// inherits it passes on a page with no `<noscript>` fix at all.
const noScripts = {
  javaScriptEnabled: false,
  contextOptions: { reducedMotion: "no-preference" as const },
};

const config: PlaywrightTestConfig = {
  ...base,
  // Aria snapshots (tests/smoke/chrome.spec.ts) are named explicitly and are
  // platform- and project-independent — an accessibility tree is the same tree
  // on macOS and on CI's Linux, which is the reason to prefer it over a pixel
  // baseline here. The default template appends {-projectName} and a platform
  // suffix, which would make one snapshot per cell for no gain.
  snapshotPathTemplate: "{testDir}/__aria__/{arg}{ext}",
  projects: [
    // The whole suite, unchanged: 1280x720, scripts on, reduced motion.
    { name: "chromium", use: { ...desktop } },
    { name: "no-js", testMatch: RENDERING_INVARIANTS, use: { ...desktop, ...noScripts } },
    { name: "phone", testMatch: RENDERING_INVARIANTS, use: { ...phone } },
    { name: "phone-no-js", testMatch: RENDERING_INVARIANTS, use: { ...phone, ...noScripts } },
  ],
};

export default config;
