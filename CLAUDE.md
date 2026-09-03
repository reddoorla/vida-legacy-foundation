# CLAUDE.md

Session rules for AI agents working a Reddoor site repo. This file ships with
the template, so every site generated from it starts with these rules.

## Before you push

```bash
pnpm verify
```

That is exactly what CI runs, in CI's order (prettier → eslint → svelte-check →
build → axe audit → unit + smoke). Run it instead of guessing which subset
matters — a red CI on a site repo costs a round trip through review.

Formatting is enforced on `.svelte` files too: the plugin loads from
`.prettierrc`, not from a CLI flag. Don't reintroduce `--plugin` to the `lint`
script — with no config file, `prettier --check .` silently skips every
`.svelte` file, and that is exactly the hole the config closes.

## Concurrent sessions

Site repos generally get **one** agent session at a time — but central
fleet-maintenance sessions (reddoor-maintenance) also open PRs here, so:

- **Check for an existing fix before starting one.** Look for fresh `fix/*`
  branches and open or just-merged PRs addressing the same signal — a fleet
  session may already have been dispatched for it. A duplicate fix gets
  closed as superseded, never merged.
- **Re-verify after any pause.** After a session-limit pause, compaction, or
  long gap: `git log --oneline -3` and `git status` before committing, and
  re-confirm the PR head SHA before merging.
- **If sessions must run concurrently** (rare), each works in its own git
  worktree — never commit from a checkout another session may be using.
- **Check a PR's real changed-file list before merging.** Fleet branches can be
  stacked on another open PR and drag it onto main.

## Orientation

| Looking for                       | Go to                                                                       |
| --------------------------------- | --------------------------------------------------------------------------- |
| What this stack ships             | [docs/STARTER.md](docs/STARTER.md)                                          |
| What's still a template default   | [docs/NEW-SITE.md](docs/NEW-SITE.md)                                        |
| A11y conventions and the axe gate | [docs/accessibility.md](docs/accessibility.md)                              |
| CSP, headers, form anti-bot       | [docs/security.md](docs/security.md)                                        |
| Page rendering                    | `src/routes/[[preview=preview]]/[uid]/+page.server.ts` → `$lib/page-load`   |
| Prismic slices                    | `src/lib/slices/<Name>/` — `model.json`, `mocks.json`, `index.svelte`, test |
| Brand tokens                      | `src/app.css` `@theme` block                                                |

## Traps

- **`src/lib/slices/index.js` and `src/prismicio-types.d.ts` are generated** by
  Slice Machine. Regenerating overwrites curated `mocks.json` content with
  lorem — re-curate after any regen, and check Number fields didn't come back
  as strings.
- **The `your-prismic-repo-name` sentinel is load-bearing.** It keeps a
  clone's build green before the CMS exists. See docs/NEW-SITE.md.
- **`RepositoryNotFoundError` extends `NotFoundError`.** Catching `NotFoundError`
  to serve a 404 will silently swallow a misconfigured repository name.
- **Never hand-roll `scrollTo`** — use `$lib/utils/instantNavScroll`.
- **Never redraw an asset in CSS** when the real file is downloadable. Ship the
  file.
- **A custom Tailwind v4 breakpoint must be `--breakpoint-*` and in `rem`.**
  Measured in the built CSS: a px-valued key and an arbitrary `min-[1440px]:`
  variant are both emitted BEFORE the rem-valued defaults, so `sm:` wins and
  the rule never applies — silently. (`--screen-*` is v3 naming and v4 ignores
  it outright; this site really runs on v4's defaults, 640/768/1024/1280.)

---

# Vida Legacy Foundation — site-specific

Everything below is VLF, not the template. **This repo is public** — client
contacts, Figma/Dropbox/Discord links and board notes deliberately live outside
it, in the operator's local notes, not here.

## Where the build actually stands

Bootstrapped 2026-09-01. CI green, branch protection on (every change to `main`
goes through a PR).

**The CMS is live as of 2026-09-01.** `slicemachine.config.json` points at the
real `vida-legacy` repo — the `your-prismic-repo-name` sentinel is **gone**, and
loud-fail prerendering is armed. A 404 during prerender now fails the build.
That was verified: `pnpm verify` passes green against the live repo.

What is in Prismic:

- `page` custom type (uid, title, slice zone, SEO group) and all 9 shared
  slices, pushed from Slice Machine.
- Locales `en-us` (master) and **`es-mx`**. Note the Spanish source copy is
  labelled _Español latino (EE. UU.)_; `es-mx` is the nearest thing Prismic's
  picker offers. Baked into URLs — changing it later is a migration.
- One document: `home` (`apdOUREAADAAAfBa`), published, **empty slice zone**.
  It is a deliberate stub whose only job was to satisfy the prerender so the
  sentinel could come out. The home page currently renders as nav + footer +
  an `<h1>` and nothing else. `/figma-slices` fills the slice zone.

Slice and custom-type models CAN be pushed from a session: `@slicemachine/manager`
is in the pnpm store (not a top-level dep; load its CJS entry, the ESM one fails
on a directory import) and, once `~/.prismic` holds a login, its
`slices.pushSlice` / `customTypes.pushCustomType` do what Slice Machine's Push
button does. Documents _can_ be created over MCP, but only staged into a
release; **publishing is a human step in the dashboard** — do not call
`publish_release`.

What is NOT done, in the order it blocks things:

1. **The site has no real content.** The homepage slices exist and the mocks
   render, but the `home` document's slice zone is still empty — filling it is
   a Prismic authoring job, not a code one.
2. `src/lib/site-config.json` **footer and nav are both populated.** One
   nav target is provisional: `Become a Donor` points at the operator's noted
   registry URL, which the client has not confirmed. `Contact Us` keeps its
   `/contact` href on purpose — the layout intercepts that link into the
   contact modal (below), and the route stays as the no-JS fallback and the
   crawler's target.
3. **`Who we are` and `Donate` name pages that are not live yet.**
   Prerendering loud-fails, and the crawler follows every internal link it
   renders — so a hard-coded `/about` href in the chrome 404s the build until
   that Prismic page is published. Chrome items therefore carry a page
   reference (`"page": "about"`, `"page": "donate"` in `site-config.json`)
   instead of a path: the root layout lists the page documents published in
   the request's locale, and `loadSiteConfig(lang, publishedUids)` links a
   reference only when its page is live, falling back to the item's `href`
   (Donate → the LGL form) or to no link at all (`Who we are` renders a `<p>`
   in the footer and a `<span>` in the menu). Publishing the page is the
   whole change; no code follows. A previewed release sees its own links.
4. Netlify site + `FORMS_INGEST_URL` / `FORMS_INGEST_TOKEN` (docs/NEW-SITE.md).
5. **The donation form ships hidden.** `DonationForm` (Figma `5328:1611`)
   keeps the comp's form behind a `show_form` Boolean that defaults to off:
   the donate page renders the heading and intro with two buttons out to
   LGL's hosted form and PayPal. Flipping the Boolean in Prismic draws the
   on-page form — which has NO backend (native validation, and a submit
   stays on the page with a status line pointing at PayPal). Do not flip it
   before one exists. Measured 2026-09-02 for whoever wires it: LGL's engine
   takes a multipart POST to `/form_engine/<id>` with
   `submission[args][field_N]` names, but carries a reCAPTCHA v2 on LGL's
   own site key (domain-bound — a post from our page cannot satisfy it
   unless the client turns the CAPTCHA off in LGL's form builder), a Rails
   authenticity token (a blank cross-site post re-rendered the form rather
   than 4xx-ing, so possibly lenient; unproven without a real submission),
   and three required fields the comp lacks (Verify Email, Country, a
   tribute choice with an honoree name). The route that keeps the design
   is our form → a Netlify function → Stripe or PayPal → LGL's REST API
   (`POST /api/v1/constituents/{id}/gifts`, API key from Settings →
   Integration settings).

## Brand colours — two of them cannot hold text

Token values come from the **Figma variables** on the Design page, not from
`VLF_Brand-Cheat-Sheet.pdf`. Where the two disagreed the PDF was wrong by one
value per channel (background `#fef5e9` → `#fdf5e8`, night `#00263f` →
`#01263f`, sand `#f1e9dd` → `#f2eadd`), which showed up as a visible seam
where the shipped logo SVG — which bakes the Figma value — met the page.

Measured against the beige ground `#fdf5e8` (AA needs 4.5 body, 3.0 large):

| token                        | hex       | ratio on beige | use               |
| ---------------------------- | --------- | -------------- | ----------------- |
| `--color-green`              | `#9cbf5b` | **1.94**       | fill only         |
| `--color-coral`              | `#de7762` | **2.80**       | fill only         |
| `--color-green-mid`          | `#527e01` | **4.47**       | large text only   |
| `--color-green-mid-aa`       | `#507b01` | 4.65           | green at any size |
| `--color-primary` (blue)     | `#065184` | 7.71           | text, links       |
| `--color-accent` (dark red)  | `#652323` | 10.67          | accent text       |
| `--color-secondary` (forest) | `#2c3b1a` | 11.10          | body text         |
| `--color-green-btn`          | `#263b02` | 11.35          | text, button fill |
| `--color-dark` (night)       | `#01263f` | 14.37          | text              |
| `--color-green-deep`         | `#172303` | 15.18          | text, dark ground |

**The design's button couple is `#263b02` + `#9cbf5b` — 5.86:1 in both
directions.** Dark-on-green in the cream sections, green-on-dark in the navy
ones. All three buttons in the comps were measured; the design contains no
white-on-green anywhere. Do not introduce it — white on green is 2.10.

> An earlier version of this file claimed white-on-green _was_ the design's
> primary "register to become an organ donor" button. That was wrong. The
> comps never specified it.

The genuine edge case is `--color-green-mid` `#527e01` at **4.47** — it misses
AA body by 0.03 and the design uses it for small text (the 10px footer
copyright) and form placeholders. **That is the one place the comps fail WCAG
outright.** `--color-green-mid-aa` `#507b01` is the same green darkened 2%
(delta 2/3/0 per channel, indistinguishable beside it) and clears AA body at
4.65. Use `-aa` for green text below display scale; keep `--color-green-mid`
for the big stuff, where the exact Figma value matters and 4.47 already passes.

### The dark grounds have their own ceilings

`--color-blue-textured` `#004370` is the stats card raised off the navy band —
the lightest dark ground on the site, so the tightest:

| on `#004370`    | ratio    |
| --------------- | -------- |
| `#fdf5e8` beige | 9.53     |
| `#9cbf5b` green | **4.92** |

The site's grain sits over it at 15% `mix-blend-difference`, and the texture's
brightest pixel is **254** — which lifts the ground to `#265575` at worst and
takes green to **3.80**. That still passes for the 36px stat figures (large
text) and they are the only green on it. **Do not put small green text on this
ground.**

The stats card's four columns hold from Tailwind's `xl` (1280) up, not from
the comp's 1440: a maximized 1440 window is 1425 of viewport once the
scrollbar is paid, and that fell to 2x2 on the client's own screen. The
register pill takes two lines below ~1430 — it needs 291px against the
comp's own 282.5px column, so it wraps even in the comp's frame — and the
pill's 40px min-height swallows both lines without growing.

`pnpm test:a11y` gates all of this, so a regression fails CI rather than
shipping — and the footer renders on every audited route, so its contrast is
genuinely covered. But the gate only sees rendered routes. Do not assign
`--color-green` or `--color-coral` to text in a slice and assume review will
catch it.

## Fonts — the shared kit `noj4tji`

Wired in `src/app.html`. The site started on kit `alh8out` because the fleet's
shared kit had `pragmatica` but no `pragmatica-extended`; **all of Pragmatica
plus Area Normal were added to `noj4tji` on 2026-09-02**, so it is on the
shared kit now. What it serves (measured from the kit CSS):

| family                | weights                                |
| --------------------- | -------------------------------------- |
| `pragmatica-extended` | 200–900 incl. **300 Light**, + italics |
| `pragmatica`          | 200, 300, 400, 700, 900, + italics     |
| `area-normal`         | 600, 700                               |

The Figma text styles, and what `app.css` does with them globally:

| style  | face                              | base rule              |
| ------ | --------------------------------- | ---------------------- |
| H1–H3  | Pragmatica Extended **Light** 300 | `h1, h2, h3 { 300 }`   |
| H4–H5  | Pragmatica Extended **Book** 400  | `h4, h5, h6 { 400 }`   |
| Body 1 | Pragmatica Light 16/24            | `body { 300 }`         |
| Button | Pragmatica Extended Book 10       | `.font-button { 400 }` |

Sizes stay per slice. A display-size text that is not a heading element (the
nav menu's entries, a stat figure) needs `font-light` itself.

**Buttons are Pragmatica Extended Book, not Area Normal.** The comps set most
buttons in Area Normal Bold 10/1.5 tracked 1px and one — "register to be an
organ donor" — in Pragmatica Extended Book 10/1.5 tracked 1.5px; the client
called Area Normal the oversight (review round 2, 2026-09-03). `--font-button`
is pragmatica-extended, `.font-button` is 400, and every button, the nav
toggle, the footer's fine print and the email links take the 1.5px tracking.
The kit still serves `area-normal`; nothing on the site asks for it. The
pill's hover (the arrow drifts, the pill brightens a step) and press bump are
in `.vlf-pill` itself, the fleet's `bump` timings, gated on reduced motion.

Adding more families to the kit costs almost nothing client-side: browsers
fetch a `@font-face` file only when text actually uses that family and weight,
so an unused face is a few hundred bytes of kit CSS, not a download. The kit
CSS itself is ~50 KB for the whole fleet's list.

Verifying a weight, if you touch this: `document.fonts.check('300 16px
"pragmatica-extended"')` returns **`true`** even when a weight does not exist —
it matches at family level after fallback. Iterate `[...document.fonts]` and
read each face's `.weight` / `.status` instead.

## Two CSP traps, both silent

1. **`p.typekit.net` belongs in `style-src`, not just `font-src`.** It serves a
   second stylesheet (`p.css`) as well as the woff2 files. With only `font-src`
   the browser blocks `p.css` and no face ever registers. The smoke suite's
   console-error assertion is the only thing that surfaces this — keep it.
2. **No inline event handlers.** The fleet's usual font trick —
   `media="print"` plus `onload="this.media='all'"` — is an inline handler, and
   this site's CSP grants `script-src` nonces _without_ `'unsafe-inline'`. A
   nonce never authorises an inline handler, so the swap is blocked, `media`
   stays `"print"`, and fonts are fetched but never applied with no error on the
   happy path. The plain `<link rel="stylesheet">` here is deliberate.

## Assets and copy already in the repo

| path                             | what                                                           |
| -------------------------------- | -------------------------------------------------------------- |
| `static/logo-mark.svg`           | the mark alone (blue swoosh, green swoosh, heart)              |
| `static/logo-lockup.svg`         | full horizontal lockup, mark + wordmark                        |
| `static/favicon.png`             | the mark at 94% on cream, 512²                                 |
| `content/es-website-content.txt` | Spanish site copy, 171 paragraphs, keyed to the Figma sections |

The Spanish source is labelled _Español latino (EE. UU.)_. The locale actually
added in Prismic is `es-mx` — see the CMS notes above.

The logo came out of Figma via `download_assets`, which returns the lockup plus
separable sub-assets; the mark is the 2:1 one. The Dropbox logo-package share
link is **not** usable programmatically — it renders its file listing
client-side, so there is nothing to fetch server-side.

The favicon's ceiling, so nobody re-litigates it: the mark is 2:1, so it can
never fill more than half a square tile's height. 94% inset was chosen over 84%
(too small at 32px); a cream tile was chosen over transparent, which nearly
disappears on a dark tab bar. 16px stays marginal regardless of inset.

## Still template defaults

None that matter: `static/og-default.png` is the VLF lockup on cream (1200×630,
shipped in PR #4) and `src/lib/site-config.json` carries the real footer and
nav. `DEFAULT_OG_IMAGE` points at the card.

## Matching the comp is measured, not eyeballed

The review standard is "match the Figma" at the comp's 1440 width — positions,
sizes and type within a few pixels, with responsive lenience. Two comp facts
decide most of it and are invisible in a screenshot:

- **Figma trims its Pragmatica Extended text boxes to cap height and
  baseline.** A 12px label is an 8px box, a 60px line a 42px one, so every
  gap the comp specifies is cap-to-baseline. The `t-*` utilities in `app.css`
  (`t-display`, `t-stat`, `t-lead`, `t-label-lg`, `t-label`, `t-label-sm`,
  `t-body`) are the comp's text styles with `text-box-trim` on the Extended
  ones, and a slice takes a style by name instead of re-deriving it. Body
  copy and button labels are not trimmed in the comp and are not here.
- **The comp pins bands** ("sticky scrolls") so the next one slides up over
  them: the lead paragraph, the full-bleed photo and the closing statement on
  the homepage, the board section on Who We Are. A `.sticky-cover` section —
  and, by rule, whichever section precedes `CtaBanner onCream` — is pinned,
  every slice section is positioned so tree order paints later ones over it,
  and `$lib/actions/stickyCover` (on `<main>`) measures each band so a tall
  one holds by its bottom edge. `CtaBanner onCream` is a full-bleed cream
  panel on a transparent section: its rounded corners show the pinned band
  through, whatever colour that band is. The homepage's closing statement
  ("Hope that heals. Help that Lasts.") is a departure the client asked for,
  and it took two rounds to land: the line comes to rest at the BOTTOM of the
  screen rather than the top, and the band keeps the comp's own height doing
  it. `.sticky-cover--bottom` is that — stickyCover gives the band the full
  `viewport - height` offset, positive for a short band, so it holds by its
  bottom edge. The first attempt grew the band to `min-h-dvh` instead, which
  put the comp's 60px between the stats card and the line at a whole viewport
  ("it shouldn't grow that much", round 4).
- **The panel rolls over the PAGE, not over one band.** Pinning only the band
  before it left that band stopping dead while the sections above it kept
  scrolling — "out of flow", round 4, and the hole it opened showed a strip
  of the pinned photograph. `coverRun` in `$lib/actions/stickyCover` walks
  back from the closing panel, stacking each section's bottom against the top
  of the one below it until the stack fills the viewport, and writes
  `data-cover-run` + the offset on each (app.css pins those). Every member
  therefore pins on the same scroll position: the whole screen holds still
  and only the panel moves. The walk stops at a `.sticky-cover` band, which
  is already holding on its own account and fills whatever is left above —
  on the homepage that is the full-bleed photograph, so the frozen screen is
  "Compassion in Action" + "By the numbers" + the closing line over it.
  **The stack is measured fractionally and overlaps by a pixel at every
  joint.** `offsetHeight` rounds to whole pixels and the real bands are
  fractional (327.61, 301.81), so butting the boxes edge to edge left a
  sub-pixel seam that showed the photograph behind — intermittently, because
  a sticky offset is composited. `getBoundingClientRect().height` (falling
  back to `offsetHeight` where there is no layout, i.e. jsdom) plus
  `STACK_OVERLAP` fixes both that and the closing band's own bottom edge,
  which now lands exactly on the viewport's.

The VLF variations that sit in the comp's right-hand column (952.5 of the
1280 grid, from x=407.5) carry a `layout` Select — `float right` (the comp,
and what a document authored before the field gets) or `fill`. `ContentBand`
writes it as `data-layout` on the section, and that is what
`$lib/actions/companionRun` reads: the `IconColumns` intro ("A companion on
the journey") holds not just for its own band but for the run of float-right
sections after it, which leave the left column empty. The band grows by the
run's measured height (a spacer row in its grid) and a negative bottom margin
pulls the run back up over the spacer, so the intro's sticky range — its grid
area — reaches the run's end. The run stops at a pinned band.

`scripts/figma-compare/` is the harness: comp geometry and renders from
Figma's REST API, the rendered site measured the same way with Playwright,
and the two matched by text content. README in the folder. Run it before a
PR that touches layout or type and read the deltas; the Figma file key and
token stay in the environment.

## Two locales, one route tree

Spanish ships at launch. English is the master locale at the bare paths;
Spanish is `/es` and `/es/<uid>`. The prefix is the optional route param
`[[lang=lang]]` (matcher: `src/params/lang.ts`, only `es` — `/en` is
deliberately not a URL), so one set of loaders serves both and `params.lang`
picks the Prismic locale through `$lib/locale`. Prismic's ids (`en-us`,
`es-mx`) never reach a URL.

- **Prerender enumerates both locales** from `getAllByType("page", { lang:
"*" })` via `$lib/prerender-entries`. A locale whose document is not
  published is simply absent from `entries()`, so an unpublished translation
  never becomes a 404 that fails the build.
- **The language switch only renders where the target exists**: a Prismic
  page's published translation (`page.data.alternates`), or a route in
  `LOCALIZED_STATIC_ROUTES` (`/contact`). Anything else — a page with no
  translation yet, the dev pages — gets no switch, because the crawler would
  follow it into a 404. Do not "fix" a missing switch by pointing it at `/es`
  until the Spanish home is published.
- **Chrome per locale** lives in `site-config.json` under `locales.es` (nav and
  footer replaced wholesale, hrefs included); `loadSiteConfig(lang)` resolves
  it. The contact page carries its own two-language copy.
- **The words the chrome supplies itself** — the skip link, "Open menu",
  "Close menu", the menu dialog's name, the language group's name, a dialog's
  close button, "Read the bio for …", the landscape cover — are in
  `$lib/ui-copy` (`ui(lang)`), because nothing translates them: they are code,
  not content. Components take the page's `lang` and slices read
  `context.lang`, the same split the contact and donation forms use for their
  field labels. `Modal` takes a `closeLabel` so its caller decides. Anything
  new that a visitor can read and Prismic does not write belongs there, or
  the Spanish site announces it in English (it did, until round 4).
- **Head**: `<html lang>` is set per request in `hooks.server.ts` (app.html
  carries `%lang%`), `og:locale` comes from the loader, and `Seo` emits
  reciprocal `hreflang` links plus an English `x-default` only when a page has
  a translation.
- **Previews** pass the locale-aware `linkResolver`, so an es-mx preview lands
  on `/es/…`.

## The nav has no ground of its own

The bar (Figma `5314:2013` / `5314:1743` / `5314:1744`) is transparent and
fixed over the page, so its colouring is decided by whatever the page's
**first slice** paints under it. `$lib/nav-tone` maps that slice to the comp's
variant — `heart_hero` → all-cream lockup, `page_masthead` → cream wordmark
with the green swoosh, anything else → the blue default — and the layout passes
it in. Once the first slice's bottom edge scrolls under the bar, Nav swaps to a
cream `bg-background/95` bar with the default lockup; that state is measured
from the DOM (`#main-content`'s first child), not a scroll offset, because
HeartHero is a 260vh runway and the swap must not fire mid-hero.

Below `md` the bar also leaves once the first section is past — see "Mobile is
not the comp scaled down" below.

The three lockup files in `static/` are the same shipped SVG with each
variant's fills — `navbar-white` really does set `FOUNDATION` and the heart to
`#FFFFFF`, not cream — not redraws.

**Two deliberate departures from the comp:** `navbar-white` draws a cream
hamburger on the green hero, which is 1.93:1 against `#9cbf5b`. A logo is
exempt from contrast rules; a control is not (1.4.11 wants 3:1). The hamburger
there is `--color-green-btn`, the design's own dark-on-green pairing at 5.86.
And the bar carries an EN | ES toggle the comp does not have — a pill in the
donate button's clothes, the current locale marked, the other side a link
only when its page exists (an inert label otherwise, so the visitor still
sees which version they are on). The lockup links to the locale's own home.

The open menu (`5314:1679`) is `NavMenu`, extracted so the a11y fixtures can
render it in-flow (`inline`) — the real one is not in the DOM until opened, so
that fixture is the only thing that puts its colours in front of axe.

**Switching language does not reload, and does not fade.** The toggle is
`LangToggle` — a plain Kit link with `data-sveltekit-noscroll`, so the reader
keeps their place — and the open menu carries the same control under its
entries (round 3: not the language's name as a text link). The layout's
`onNavigate` wraps that one navigation (the target is `switchTo.href`) in a
view transition — the browser's own crossfade of the whole document, 350ms in
app.css, skipped where unsupported or under reduced motion — and an effect
restamps `<html lang>`, which hooks.server.ts only sets per request. Nav keeps
the menu OPEN across a switch (the new path is the one the toggle offered), so
the entries change language under the visitor; any other route closes it. The
toggle moves focus to its new link after a press, because the pressed side
becomes the marked span.

**Every other route change is a hard swap, and the overlay is a loading cover,
not a page effect** (round 3: "only if we actually need it for loading").
`TransitionOverlay` shows only if a navigation is still pending after 200ms,
then holds at least 400ms and fades over 400 — a prerendered page usually
lands inside the delay and nothing is shown. It is the menu's textured dark
green (not the fleet's black) and takes a `skip` predicate: the contact link is
cancelled into the modal, and a cancelled navigation never fires
`afterNavigate`, so without the skip the overlay would come up and stay.

## Mobile is not the comp scaled down

The comps are 1440x860 landscape and every full-bleed measurement in them is a
percentage of WIDTH. A 390x664 phone breaks four of those outright, and each
fix is measured, not guessed (review round 3, 2026-09-03):

- **The heart never opened.** `heartEndPct` (`src/lib/slices/HeartHero/heart.ts`)
  replaces the hard-coded 187.2%: the comp's open mask is 2696x2352 on an
  860px band, so what it really fixes is the heart at **2.735x the band's
  height** — which is why its cleft and point sit off-screen and the photo
  fills the frame. Held as a ratio, the comp's own band still computes 187.2%
  and a phone gets ~534%. The stage is measured with a ResizeObserver in both
  motion modes, since reduced motion lands on the open frame.
- **Full-bleed photos were center-cropped AND magnified.** On a phone the
  browser picked a 390px-wide candidate for a 390px-wide box, then
  `object-cover` scaled it 2.8x to fill a 664px-tall one — the about
  masthead's embrace became a forehead. `HeroBackgroundImage` takes a
  `portrait` aspect and emits a `<picture>` whose narrow-viewport `<source>`
  is an imgix crop at that shape around any face it finds
  (`portraitSrcset` in `$lib/utils/image`), with one `<link rel=preload>` per
  source carrying its own `media` so the browser preloads what it will
  actually pick. The `<picture>` is `display: contents`, or the `<img>`'s
  `h-full`/`absolute` would resolve against an inline box with no height.
  Set it on a hero whose box is the viewport; leave it off a band that keeps
  the comp's landscape shape at every width.
- **The bar goes away below 767px** once the first section is behind you
  (`data-hidden` on the `<nav>`): these pages are short and few, and a fixed
  bar costs a tenth of a phone screen all the way down. Any upward scroll
  brings it back, as does `focus-within`, so a keyboard visitor can never tab
  to an off-screen control. Desktop is unchanged.
- **The bio pop-up drops its headshot below md.** The visitor tapped that very
  face on the card, and at 390px the square photo pushed the name, role and
  bio off the screen. The comp's two-column pop-up is a desktop shape.

## The donation form's labels are code, its copy is content

`DonationForm` is one slice that IS the donate page — the comp has no
masthead, so the slice renders the `<h1>`. The author owns the copy around
the form (heading, eyebrow, paragraph, both button labels, the preset
amounts); the field labels, placeholders and the schedule options live in the
component in both languages, keyed by the document's locale. That split is the
contact page's: the labels belong to the field set, which is the payload the
backend will read, and they change with it. The locale reaches the slice
through SliceZone's `context` — both page routes pass `{ lang }` — so a slice
that needs the locale reads `context.lang`, never `$app/state`, which keeps it
renderable in the fixtures and the simulator.

Two things the comp draws that the slice does not: the reCAPTCHA (it belongs
to the backend) and a 100px-fixed schedule dropdown ("Quarterly" and
"Trimestral" overflow it; the width follows the longest option).

## The contact modal is the contact page, and vice versa

`ContactModal` (mounted once by the root layout) is the fleet's appointment
modal pattern in the donation page's vocabulary: Modal's native `<dialog>`,
a form that posts to the contact route's own action (`/contact` or
`/es/contact`, so the ingest payload and the anti-bot screen are the route's),
the timing token stamped at open time because a layout-mounted modal has no
server load, the action's own failure copy shown with the typed values kept,
and focus moved to the confirmation. **Any link to the contact route opens
it** — the layout cancels that navigation in `beforeNavigate` and opens the
dialog instead (a document click listener would race Kit's own) — so the
nav, a footer row or a Prismic link field reach it with a plain href, and
without scripts that href is the contact page, which renders the same panel
in-flow
(`inline`, `headingLevel={1}`, the route's `formTs`). The fixtures page mounts
it `inline` too, because the real dialog is not in the DOM until opened.

The vocabulary itself is app.css `.vlf-label` / `.vlf-field` /
`.vlf-field--area` / `.vlf-pill`, shared with `DonationForm`, with the
contrast measured there. A new form on this site uses those classes, not
`Field.svelte`.

`Modal` keeps the native `<dialog>` (focus containment, Escape, restore) as a
transparent full-viewport frame; the dim + blur is a real element inside it,
because `::backdrop` cannot transition out, and the sheet mounts with Svelte
`fade`/`fly` from `$lib/transitions`. Closing runs the outro first and only
then closes the dialog and calls `onclose` — so a parent that unmounts the
Modal on close (`PersonGrid`) does not cut the exit short. Escape is taken
through the same path via `cancel`. The transitions are `|global`: PersonGrid
creates its Modal already open, and a local intro only plays when its own
block toggles — without the modifier the bios left with an animation and
arrived without one.

## The footer is chrome, not a slice

It renders from `site-config.json` through `+layout.svelte`, so it is NOT in
the slice zone and an author cannot reorder or remove it. Two site-specific
hints were added to `FooterText` for it, both optional:

- `tight` — hug the row above at 15px instead of the 30px inter-row gap, so a
  label and its detail lines read as one group (`Contact us` → phone →
  address).
- `tone` — `"detail"` is the link colour for contact lines, `"fine"` is the
  small print. Colour only; the sizes come from the row itself.

The footer's ground is `--color-background`, deliberately: it is the last
tenant of the cream panel that `CtaBanner onCream` rounds off, so it has to
continue that panel rather than restart on its own colour.

It also slides over the pinned band with that panel. A sticky box is released
at the end of its containing block, and the footer is outside `<main>` — so on
its own the panel slid over the band and then the footer pushed everything
back into flow. `stickyCovers` measures the footer and sets `--footer-h` on the
parent both share; `main::after` grows by it and `main + footer` is pulled up
over that spacer (app.css). Padding would not do: sticky is constrained to the
content box. Without JS the footer simply follows in flow.

The second column's five rows sit at one 30px pitch — the client asked for
equal gaps, a deliberate departure from the comp's 30/15. `tight` still
exists on `FooterText`; nothing uses it.
