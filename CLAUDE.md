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

Custom types still cannot be created from an agent session — there is no
create-custom-type API, and the Prismic MCP connector is read-only for types.
Pushing a new one means `pnpm slicemachine` and a browser. Documents _can_ be
created over MCP, but only staged into a release; **publishing is a human step
in the dashboard** — do not call `publish_release`.

What is NOT done, in the order it blocks things:

1. **The site has no real content.** The homepage slices exist and the mocks
   render, but the `home` document's slice zone is still empty — filling it is
   a Prismic authoring job, not a code one.
2. `src/lib/site-config.json` **footer and nav are both populated.** Two of
   the nav's targets are provisional: `Contact Us` points at the template's
   `/contact` route (an unstyled skeleton — the recorded decision is a contact
   _modal_, which has no comp yet), and `Become a Donor` points at the
   operator's noted registry URL, which the client has not confirmed.
3. **`Who we are` has no href yet, and that is deliberate.** Prerendering
   loud-fails, and the crawler follows every internal link it renders — so a
   `/about` href in the footer or nav 404s the build until that Prismic page
   exists and is published. The footer item and the nav entry both ship
   href-less (the footer renders a `<p>`, the menu a `<span>`); adding
   `"href": "/about"` to both is the whole change once the page is live.
4. `DEFAULT_OG_IMAGE` unset — every share is imageless. Needs a 1200×630
   `static/og-default.png`.
5. Netlify site + `FORMS_INGEST_URL` / `FORMS_INGEST_TOKEN` (docs/NEW-SITE.md).

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
| Button | Area Normal Bold 10               | `.font-button { 700 }` |

Sizes stay per slice. A display-size text that is not a heading element (the
nav menu's entries, a stat figure) needs `font-light` itself. The button rule
is explicit because the kit serves `area-normal` at 600 and 700 only — with
the body at 300 the browser would settle on 600.

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

`DEFAULT_OG_IMAGE` is intentionally unset — shipping the starter's card would
leak Reddoor branding onto a client site. Needs a 1200×630 `og-default.png`.
`src/lib/site-config.json` now carries the real footer and nav.

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

The three lockup files in `static/` are the same shipped SVG with each
variant's fills — `navbar-white` really does set `FOUNDATION` and the heart to
`#FFFFFF`, not cream — not redraws.

**One deliberate departure from the comp:** `navbar-white` draws a cream
hamburger on the green hero, which is 1.93:1 against `#9cbf5b`. A logo is
exempt from contrast rules; a control is not (1.4.11 wants 3:1). The hamburger
there is `--color-green-btn`, the design's own dark-on-green pairing at 5.86.

The open menu (`5314:1679`) is `NavMenu`, extracted so the a11y fixtures can
render it in-flow (`inline`) — the real one is not in the DOM until opened, so
that fixture is the only thing that puts its colours in front of axe.

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
