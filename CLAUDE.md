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

## The work journal

**Every working session appends a dated entry to `docs/workJournal.md`** — what
was done and **why**, newest at the bottom, never corrected in place. Write it
as the last act of the session, not the first act of the next one.

The journal is the history of executing the build. Code says what the system
does now; the journal says what it used to do, what it cost to change, and
which beliefs turned out to be wrong. Nearly everything expensive to rediscover
lives there and nowhere else.

An entry is headed with the date, a short title, and where it landed:

```markdown
## 2026-09-04 — Both runway stages render their final frame without JS (#51, `ce46ae0`)
```

Then prose — not a bullet list of file names, which the diff already tells you.
What to put in, in rough order of value:

- **Why, over what.** The reason a thing was done survives; the diff does not
  need restating.
- **Measured numbers, exactly.** "The comp's open mask is 2696×2352 on an 860px
  band — 2.735× the band's height, so a 390×664 phone needs ~534%" is worth
  keeping. "Fixed the hero on mobile" is not.
- **Defects, named.** What broke, what it looked like, and what made it
  invisible until it wasn't.
- **What was tried and abandoned**, and what it would take to revive it. A dead
  end nobody wrote down gets walked twice.
- **Beliefs corrected on contact.** The design assumption that turned out false
  is usually the most valuable line in the entry.
- **Honest accounting.** If a win came from somewhere other than the change
  that claimed it, say so — that is exactly what someone will otherwise
  over-invest in next.

**History is never edited to be right.** An entry that stops being true is not
rewritten; a later entry corrects it, and says which one it corrects. The
journal is a record of what was believed at the time, and that record is most
useful precisely where it was wrong. Fixing the past in place destroys the only
evidence of how the mistake was made.

The one edit an old entry may take is a **forward pointer**: one line directly
under its heading naming the entry that overturned it — `> Superseded in part by
2026-10-14 — <that entry's title>.` It asserts nothing new and retracts nothing,
so the record of what was believed survives whole; it only stops a reader who
lands on the old paragraph from leaving with the old answer. Without it the rule
above is half a mechanism: the correction exists at the bottom of the file, and
nothing points to it from where a reader actually arrives.

If a session produced nothing worth an entry, that is itself worth one line.

## Orientation

| Looking for                            | Go to                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------- |
| What this stack ships                  | [docs/STARTER.md](docs/STARTER.md)                                          |
| What's still a template default        | [docs/NEW-SITE.md](docs/NEW-SITE.md)                                        |
| A11y conventions and the axe gate      | [docs/accessibility.md](docs/accessibility.md)                              |
| Whether a gate means anything          | [docs/mutation-audit.md](docs/mutation-audit.md)                            |
| What the build process got wrong       | [docs/process-review.md](docs/process-review.md)                            |
| CSP, headers, Turnstile, form anti-bot | [docs/security.md](docs/security.md)                                        |
| Colours, fonts, the logo files         | [docs/brand.md](docs/brand.md)                                              |
| Matching the comp, chrome, mobile      | [docs/layout.md](docs/layout.md)                                            |
| No-JS, reduced motion, the hero        | [docs/rendering.md](docs/rendering.md)                                      |
| The Spanish site                       | [docs/locales.md](docs/locales.md)                                          |
| The contact modal, the donation form   | [docs/forms.md](docs/forms.md)                                              |
| How it got this way                    | [docs/workJournal.md](docs/workJournal.md)                                  |
| Page rendering                         | `src/routes/[[preview=preview]]/[uid]/+page.server.ts` → `$lib/page-load`   |
| Prismic slices                         | `src/lib/slices/<Name>/` — `model.json`, `mocks.json`, `index.svelte`, test |
| Brand tokens                           | `src/app.css` `@theme` block                                                |

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
- **Never write `%sveltekit.head%` — or a comment terminator — inside a
  comment in `src/app.html`.** SvelteKit substitutes the FIRST occurrence of
  the placeholder and only the first, so a mention in prose takes the whole
  head and the real placeholder below renders literally. And the injected head
  markup carries Svelte's hydration markers, one of which is a comment that
  ends — which ends the enclosing comment too, spilling the rest of the
  sentence into the page as visible text and the head tags into `<body>`.
  Both shipped, an hour apart (the second while explaining the first), and
  neither is a console error, an axe violation or a type error, so the suite
  said nothing. `tests/smoke/pages.spec.ts` now fails on either — the load-
  bearing assertion is "no head tags loose in the body", not the placeholder
  string — and `src/app-html.test.ts` fails on the first.
- **Svelte empties a `<style>` written anywhere in a component**, not just at
  the top level — it is taken as the component's style block. And a browser
  running scripts parses `<noscript>` content as raw TEXT, so real markup in
  there does not survive hydration. Anything a no-JS visitor needs therefore
  renders normally (hidden) with a `<noscript><style>` in **app.html** to
  reveal it. That is how the nav's entry list works.
- **A custom Tailwind v4 breakpoint must be `--breakpoint-*` and in `rem`.**
  Measured in the built CSS: a px-valued key and an arbitrary `min-[1440px]:`
  variant are both emitted BEFORE the rem-valued defaults, so `sm:` wins and
  the rule never applies — silently. (`--screen-*` is v3 naming and v4 ignores
  it outright; this site really runs on v4's defaults, 640/768/1024/1280.)

---

### Site rules — the evidence is in `docs/`, the rule is here

- **Two brand colours cannot hold text.** `--color-green` (1.94 on cream) and
  `--color-coral` (2.80) are fill-only. Green text below display size is
  `--color-green-mid-aa`, not `--color-green-mid` (4.47, misses AA body by
  0.03). The design contains no white-on-green anywhere — do not introduce it
  (2.10). Small green text never goes on the stats card. → [brand.md](docs/brand.md)
- **Buttons are Pragmatica Extended Book, not Area Normal**, tracked 1.5px.
  `document.fonts.check()` returns true for a weight that does not exist;
  iterate `document.fonts` and read `.weight`. → [brand.md](docs/brand.md)
- **`p.typekit.net` belongs in `style-src`, and there are no inline event
  handlers here.** The CSP grants nonces without `'unsafe-inline'`, so the
  fleet's `onload=` font swap is silently never applied. → [security.md](docs/security.md)
- **Turnstile is bound to a hostname list. At launch, `vidalegacy.org` and
  `www.` must be added to widget "Site Forms 3" AS PART OF the DNS cutover,**
  or the form mints no token and `/health` still says true. Error `110200` =
  wrong hostname; `600010` = every automated browser, not a defect. → [security.md](docs/security.md)
- **Match the comp by measurement** (`scripts/figma-compare/`), never by eye.
  Figma trims Extended text boxes to cap height — use the `t-*` utilities. Never
  gate a layout on the comp's own 1440: a maximized 1440 window is 1425 of
  viewport. → [layout.md](docs/layout.md)
- **The home hero's motion is a Vimeo embed, and the still is its poster.**
  The comp's hero "photo" was frame 1 of iStock clip 1831051144 — which is why
  it never had a photo id to buy. `HeartHero` renders the image always and
  layers `VimeoBackground` over it only at ≥768px, with motion allowed, after a
  real interaction. **Do not reach for a `<video>` and a self-hosted mp4**: the
  fleet's pattern is the Vimeo iframe, the CSP was already provisioned for it
  (`player.vimeo.com` in script-src and frame-src), and the reveal has to be
  gated on a playback _heartbeat_ because iOS fires one `play` for a muted
  background embed and then suspends it. An iframe also ignores `object-fit`,
  so the player is SIZED to cover — `coverBox`, from the same stage
  measurements the heart uses. → [rendering.md](docs/rendering.md)
- **Anything that stacks elements by computed offsets uses
  `getBoundingClientRect().height`, never `offsetHeight`,** and overlaps every
  joint by a pixel. The seam it opens is intermittent and a screenshot proves
  nothing. → [layout.md](docs/layout.md)
- **`--nav-h`'s breakpoint is `768px`, not `48rem`** — a rem in a media query
  resolves against the BROWSER's font size, and this is the one place a rem
  breakpoint is wrong. → [layout.md](docs/layout.md)
- **The footer is chrome** (`site-config.json` through the layout), not a slice.
  **`person_grid.primary.headshots` is off at launch** — VLF has no photographs
  of its people. → [layout.md](docs/layout.md)
- **A hand-typed line break cannot align a row of cards.** `person_grid`
  honours a return typed into a name (`whitespace-pre-line`, because where
  "Vince Speeg, MD, PhD" breaks is editorial), but the alignment comes from
  `sm:min-h-[2lh]` reserving two lines. Measured: a break chosen on desktop EN
  put Holly's name on two lines against the others' one at 390px, and did
  nothing at all for `es-mx`, where no return was typed. Which names wrap is a
  function of width and of the words. → [layout.md](docs/layout.md)
- **Anything a visitor can read that Prismic does not write is code**, in
  `$lib/ui-copy` / `$lib/contact-copy` / `$lib/form-validation`, keyed by the
  page's `lang`. Never point a language switch at a page that is not published;
  `/en` is deliberately not a URL. → [locales.md](docs/locales.md)
- **A no-JS visitor's fix is a `<noscript><style>` in `app.html`**, its classes
  tripled to beat component-scoped rules. The dev server cannot show it and
  the fleet config's reduced-motion emulation hides it. `tests/smoke/rendering.spec.ts`
  runs every rendering invariant in four cells — add new ones there, with no
  `test.use`. → [rendering.md](docs/rendering.md)
- **A new form uses `.vlf-label` / `.vlf-field` / `.vlf-pill`, not
  `Field.svelte`.** Any link to `/contact` opens the modal; the route stays as
  the no-JS fallback. → [forms.md](docs/forms.md)
- **Two session gates beyond `pnpm verify`, both deliberately outside CI:**
  `pnpm test:mutate` (does the suite mean anything — [mutation-audit.md](docs/mutation-audit.md))
  and the aria snapshots in `tests/__aria__/` (regenerate with
  `npx playwright test tests/smoke/chrome.spec.ts --update-snapshots` and READ
  the diff; a name that changed language looks exactly like a snapshot needing
  an update).

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

- `page` custom type (uid, title, slice zone, SEO group) and all **17** shared
  slices, pushed from Slice Machine. (`src/lib/slices/` holds 17 `model.json`
  files and `customtypes/page/index.json` registers all 17.)
- Locales `en-us` (master) and **`es-mx`**. Note the Spanish source copy is
  labelled _Español latino (EE. UU.)_; `es-mx` is the nearest thing Prismic's
  picker offers. Baked into URLs — changing it later is a migration.
- **Six published documents**: `home`, `about` and `donate`, each in both
  locales. The home slice zone is authored — 10 slice instances, the whole
  comp — and `/`, `/es`, `/about`, `/es/about`, `/donate`, `/es/donate` all
  render and are in `sitemap.xml`. (`home` is `apdOUREAADAAAfBa`, if you need
  the id.)

Slice and custom-type models CAN be pushed from a session: `@slicemachine/manager`
is in the pnpm store (not a top-level dep; load its CJS entry, the ESM one fails
on a directory import) and, once `~/.prismic` holds a login, its
`slices.pushSlice` / `customTypes.pushCustomType` do what Slice Machine's Push
button does. Documents _can_ be created over MCP, but only staged into a
release; **publishing is a human step in the dashboard** — do not call
`publish_release`.

What is NOT done, in the order it blocks things:

1. `src/lib/site-config.json` **footer and nav are both populated.** One
   nav target is provisional: `Become a Donor` points at the operator's noted
   registry URL, which the client has not confirmed. `Contact Us` keeps its
   `/contact` href on purpose — the layout intercepts that link into the
   contact modal ([docs/forms.md](docs/forms.md)), and the route stays as the no-JS fallback and the
   crawler's target.
2. **`Who we are` and `Donate` are both published now**, so the chrome links
   straight to `/about` and `/donate` — but the mechanism that got the build
   green before they were is still load-bearing and still the rule. Prerendering
   loud-fails and the crawler follows every internal link it renders, so a
   hard-coded `/about` href in the chrome 404s the build the moment that page
   is not published in the request's locale. Chrome items therefore carry a
   page reference (`"page": "about"`, `"page": "donate"` in
   `site-config.json`) instead of a path: the root layout lists the page
   documents published in the request's locale, and
   `loadSiteConfig(lang, publishedUids)` links a reference only when its page
   is live, falling back to the item's `href` (Donate → the LGL form) or to no
   link at all (`Who we are` renders a `<p>` in the footer and a `<span>` in
   the menu). Add a chrome item for a page that is not published yet and it
   costs nothing; hard-code its path and the next build fails. A previewed
   release sees its own links.
3. The Netlify site is up and `FORMS_INGEST_URL` / `FORMS_INGEST_TOKEN` are
   set — `/health` reports `{"ok":true,"prismic":"ok"}` with both true.
   **Turnstile is live as of 2026-09-04** ([docs/security.md](docs/security.md)). Contact submissions notify
   the operator today, and that is the pre-launch guard working, **not** a
   configuration gap: the site record already carries a real `@vidalegacy.org`
   point of contact, and `resolveRecipients` short-circuits on
   `status !== "maintained"` BEFORE it ever reads that field. So
   `reddoor-maint forms-notify-target vida-legacy-foundation` printing
   `OPERATOR ONLY` is structurally incapable of naming the client while the
   site is `building` — do not read it as "the contact is missing", which an
   earlier version of this file did. Nobody has to remember the flip either:
   `updateLaunched` sets the status the moment the launch report sends, and
   notifications start reaching VLF on their own. (Turso is authoritative for
   the site record — Airtable is a legacy shadow write, not the source of
   truth.)
4. **The donation form ships hidden.** `DonationForm` (Figma `5328:1611`)
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

## Still template defaults

None that matter: `static/og-default.png` is the VLF lockup on cream (1200×630,
shipped in PR #4) and `src/lib/site-config.json` carries the real footer and
nav. `DEFAULT_OG_IMAGE` points at the card.
