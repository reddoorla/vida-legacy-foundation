import { readFileSync } from "node:fs";
import adapter from "@sveltejs/adapter-netlify";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const slicemachine = JSON.parse(
  readFileSync(new URL("./slicemachine.config.json", import.meta.url), "utf-8"),
);
const isPlaceholderRepo =
  (process.env.VITE_PRISMIC_ENVIRONMENT || slicemachine.repositoryName) ===
  "your-prismic-repo-name";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    warningFilter: (warning) => warning.code !== "element_invalid_self_closing_tag",
  },
  kit: {
    adapter: adapter(),
    // Until a clone is wired to a real Prismic repo, every Prismic-backed
    // route returns 404 during prerender. Tolerate that on the placeholder
    // so `pnpm build` (and Netlify CI) succeed; real sites still fail loudly
    // because `repositoryName` no longer matches the sentinel.
    prerender: {
      // Prerendered endpoints (robots.txt, sitemap.xml) bake `url.origin` into
      // their output at build time; without this it would be SvelteKit's
      // "http://sveltekit-prerender" placeholder. Netlify sets URL to the
      // site's production origin during builds. Local builds keep the
      // placeholder, which only shows up in build/ output, never in dev.
      ...(process.env.URL ? { origin: process.env.URL } : {}),
      handleHttpError: ({ path, status, message, referrer }) => {
        if (isPlaceholderRepo && status === 404) {
          return;
        }
        throw new Error(
          `${status} ${path}${referrer ? ` (linked from ${referrer})` : ""}: ${message}`,
        );
      },
      // A malformed URL in CMS-pasted rich text (e.g. a school name typed into a
      // hyperlink) is unparseable — it can never be a real route to crawl, and
      // one editor's typo must not fail the whole build. Warn (so it surfaces
      // for cleanup) and keep prerendering. Unlike handleHttpError's fail-loud
      // 404 policy, an invalid URL has no valid interpretation to preserve.
      handleInvalidUrl: ({ href, referrer, message }) => {
        console.warn(
          `[prerender] skipped invalid URL ${JSON.stringify(href)}` +
            `${referrer ? ` (linked from ${referrer})` : ""} — fix the CMS link` +
            `${message ? ` [${message}]` : ""}`,
        );
      },
    },
    alias: {
      $components: "src/lib/components",
      "$components/*": "src/lib/components/*",
      $utils: "src/lib/utils",
      "$utils/*": "src/lib/utils/*",
      $stores: "src/lib/stores",
      "$stores/*": "src/lib/stores/*",
      $assets: "src/lib/assets",
      "$assets/*": "src/lib/assets/*",
    },
    // Baseline CSP for Prismic + Vimeo + Turnstile + Google Fonts. EXTEND PER
    // PROJECT — every new host (a Typekit kit, YouTube, a donation platform,
    // analytics, Maps) must be added to the relevant directive or the browser
    // blocks it silently. SvelteKit adds nonces for the inline scripts it emits;
    // styles are covered by 'unsafe-inline' below, which is LOAD-BEARING: the
    // template sets style attributes (ContentBand's fallback height, the
    // animate-in transitions, app.html) and a nonce never authorises a style
    // *attribute* — removing it silently breaks those in production only.
    csp: {
      mode: "auto",
      // Violations POST to /api/csp-report. To stage a stricter policy without
      // blocking, copy `directives` below into a sibling `reportOnly: { ... }`
      // block — SvelteKit will then emit a Content-Security-Policy-Report-Only
      // header alongside the enforced one.
      directives: {
        "default-src": ["self"],
        "object-src": ["none"],
        "script-src": [
          "self",
          "https://static.cdn.prismic.io",
          "https://player.vimeo.com",
          // Cloudflare Turnstile contact-form widget (enable via PUBLIC_TURNSTILE_SITE_KEY).
          "https://challenges.cloudflare.com",
          // Little Green Light's JS embed variant of the donation form.
          "https://secure.lglforms.com",
        ],
        // Event-handler ATTRIBUTES fall under script-src-attr, which a nonce
        // never covers. Svelte 5's SSR emits exactly one on every <img> that
        // takes an attribute spread (PrismicImage, svelte-img):
        //   onload="this.__e=event" onerror="this.__e=event"
        // — its replay shim for a load/error that fires before hydration.
        // Nothing here relies on the replay (Img checks `complete` itself),
        // but the block logs a console error on every page with such an
        // image, and the smoke suite fails on console errors. 'unsafe-hashes'
        // allows that one string by its SHA-256 and nothing else:
        //   printf '%s' 'this.__e=event' | openssl dgst -sha256 -binary | base64
        "script-src-attr": ["unsafe-hashes", "sha256-7dQwUgLau1NFCCGjfn9FsYptB6ZtWxJin6VohGIu20I="],
        // Google Fonts stylesheet host (paired with fonts.gstatic.com under
        // font-src). Self-hosted fonts need nothing extra.
        //
        // use.typekit.net serves the Adobe Fonts stylesheet for Pragmatica
        // Extended Light / Pragmatica Light — the licensed stand-in for the
        // comps' Helvetica Neue, which Reddoor has no web license for.
        "style-src": [
          "self",
          "unsafe-inline",
          "https://fonts.googleapis.com",
          "https://use.typekit.net",
          // p.typekit.net serves the woff2 files (see font-src) AND a second
          // stylesheet, p.css, which the kit pulls in. Allowing only the font
          // host is not enough: the browser blocks p.css under style-src and
          // the faces never register. The smoke suite's console-error check is
          // what catches this — it is otherwise silent.
          "https://p.typekit.net",
        ],
        "img-src": ["self", "data:", "https://*.prismic.io"],
        // Prismic hosts non-image media (e.g. .mp4 assets) on
        // <repo>.cdn.prismic.io — first-party content, same origin family as
        // images.prismic.io already allowed under img-src.
        "media-src": ["self", "https://*.vimeocdn.com", "https://*.prismic.io"],
        "frame-src": [
          "self",
          "https://player.vimeo.com",
          // Cloudflare Turnstile renders its challenge in an iframe from this host.
          "https://challenges.cloudflare.com",
          // Donations run through Little Green Light — an embedded form, never a
          // hand-built payment flow. LGL sends no X-Frame-Options/CSP of its own,
          // so it is iframe-able; it also ships a JS embed at the same URL + `.js`
          // (see script-src) if the iframe proves awkward.
          "https://secure.lglforms.com",
        ],
        "connect-src": ["self", "https://*.prismic.io"],
        // p.typekit.net is where Adobe Fonts serves the actual woff2 files.
        "font-src": [
          "self",
          "data:",
          "https://fonts.gstatic.com",
          "https://use.typekit.net",
          "https://p.typekit.net",
        ],
        "base-uri": ["self"],
        "form-action": ["self"],
        "frame-ancestors": ["self"],
        // report-uri is deprecated in favour of report-to, but Firefox still
        // honours only report-uri and SvelteKit exposes no report-to hook.
        "report-uri": ["/api/csp-report"],
      },
    },
  },
  preprocess: vitePreprocess(),
};

export default config;
