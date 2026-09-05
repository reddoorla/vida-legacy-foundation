# Vida Legacy Foundation — Work Journal

Running log of build work: what was done, why, and where it landed.
Chronological — newest entry at the bottom. [CLAUDE.md](../CLAUDE.md) is the
distilled technical record — the facts, stated as rules; this is the history of
arriving at them, including what was believed on the way and turned out wrong.

The convention is in [CLAUDE.md](../CLAUDE.md) under "The work journal": every
working session appends a dated entry, prose over bullets, why over what. **History
is never edited to be right** — an entry that stops being true is corrected by a
later entry that says which one it corrects.

---

## 2026-09-05 — Backfill: the four-day build, reconstructed

Written on day five from the commit log, 49 PR bodies, the GitHub issues, and 74
of Tucker's own messages recovered from 22 session transcripts. **It is a
reconstruction, not a contemporaneous record**, and everything below this line
should be read that way — the journal did not exist while the build happened,
which is itself the finding that produced it.

Seven researchers each took a slice of the history; a second agent fact-checked
each slice against the repo and returned 48 corrections, which are applied here.
That check was not ceremony: the first draft of the bootstrap section stated that
connecting Netlify to the repo "needs a human," which was the belief when issue #7
was filed at 00:08:35Z and was false by 00:14:51Z, when the same session did it
over the Netlify API using the fleet's GitHub App installation. A journal that
enshrines the superseded half of a belief is worse than no journal.

### The shape of it

Vida Legacy Foundation is a San Antonio organ-donation and transplant-support
nonprofit. The site is SvelteKit 2 / Svelte 5 / Tailwind v4 / Prismic on Netlify,
forked from `reddoor-starter`, translated from a Figma comp, shipping in English
and Spanish. **51 commits, 49 PRs, four days**, 2026-09-01 to 2026-09-04, across
22 agent sessions and three models — Opus 5, Fable 5.1 and Fable 5, which appear
65 times across 51 commits' `Co-Authored-By` trailers, because a squashed PR carries
one per commit it collapsed.

---

### Day 1 — 2026-09-01: bootstrap, brand, and the design's own numbers

The repo came off `reddoor-starter` through `/new-site`. `9970776` applied the
file edits — `package.json#name`, `ci.yml`'s `netlify-site`, `SITE_NAME`, a
de-branded README; branch protection and the fleet row were separate steps run
from the maintenance checkout.

**The brand palette was guessed before it was read, and it cost regenerated
assets.** `app.css` took its tokens from `VLF_Brand-Cheat-Sheet.pdf`, the client's
own handout. Stage A of `/figma-slices` then pulled the Figma variables and found
the PDF wrong by one value per channel — background `#fef5e9` → `#fdf5e8`, night
`#00263f` → `#01263f`, sand `#f1e9dd` → `#f2eadd`. Not academic: the logo SVG
exported from Figma bakes the Figma value, so the shipped lockup showed a **visible
seam** against the page ground, and `favicon.png` and `og-default.png` both had to
be regenerated on the corrected cream (`1fa3dc6`, #4). The variables were one
`get_variable_defs` call away the whole time.

**A fabricated design fact shipped into CLAUDE.md and lived there a day.** `62b366e`
asserted that white-on-green at 2.10:1 was the design's primary "register to become
an organ donor" button, and therefore a WCAG problem to design around. #4 measured
all three buttons in the comps: the design contains **no white-on-green anywhere**.
Every button is the `#263b02` + `#9cbf5b` couple, 5.86:1 in both directions. The
retraction is still in CLAUDE.md as an explicit note, which is the right way to
handle it.

The logo came out of Figma via `download_assets`, not from the Dropbox share link —
that link renders its file listing client-side, so there is nothing to fetch
server-side. The favicon's ceiling was settled the same day and has not been
re-litigated since: the mark is 2:1, so it can never fill more than half a square
tile's height; 94% inset over 84%, cream tile over transparent.

**Fonts.** The site started on kit `alh8out` because the fleet's shared kit had
`pragmatica` but not `pragmatica-extended`. The kit CSS was enumerated rather than
trusted — `document.fonts.check('300 16px "pragmatica-extended"')` returns `true`
even for a weight that does not exist, because it matches at family level after
fallback. Iterating `[...document.fonts]` and reading each face's `.weight` is the
only honest check.

**Two CSP traps, both silent, both found here.** `p.typekit.net` serves a second
stylesheet as well as the woff2 files, so it belongs in `style-src`, not only
`font-src` — with only `font-src`, no face ever registers. And the fleet's usual
`media="print"` + `onload="this.media='all'"` font trick is an inline handler, which
a `script-src` nonce never authorises; the swap is blocked, `media` stays `"print"`,
and fonts are fetched but never applied, with no error on the happy path.

**Stage A of `/figma-slices`** inventoried 17 slices, seven of them reuse of starter
slices with variations. Worth recording honestly: the repo's 17 slice directories
today are **not** that 17. The inventory counted a `BioModal` that never became a
slice and treated the full-bleed photo band as a MediaText variant; it became its
own `ImageBand` (#18). Thirteen VLF slices plus four inherited starter slices
happens to also equal seventeen.

**`PR #10` was squash-merged while only its first commit existed.** Commits kept
landing on the branch after the merge; they were orphaned — no CI, nothing on main —
and only recovered when #11 cherry-picked them. The same failure mode had already
appeared three hours earlier with an orphaned docs commit.

**The fixtures page was unusable for review on its first outing.** Tucker opened it
and got another project's site — a dev server from an unrelated repo held the
shared Vite port. Then: _"there are two mains, one of which is at a capped width so
nothing is displayign right, we also need actual placeholder images to assess."_
Both real. The layout already renders `<main id="main-content">` and the fixtures
page opened a second at `max-w-3xl`, squeezing every full-bleed slice to 768px. The
axe gate did not catch the duplicate landmark, because `landmark-no-duplicate-main`
is best-practice, not WCAG A/AA, and the gate runs `--fail-on-violations` on WCAG
rules only. The media fixtures were a 1×1 transparent GIF and the mocks pointed at
`unsplash.com`, which this site's CSP blocks outright.

The replacement placeholders were **the comps' own iStock images, watermark
included**, with a code comment calling the watermark "a standing reminder that
licensed imagery is still outstanding." That comment is the only place in the repo
the watermark was ever recorded. It becomes issue #56 four days later.

**The animation was in Figma all along.** `get_motion_context` returned empty and
that was read as "the design has no animation spec." It was a component **set** with
variants. The guess made in its absence was 3× wrong.

---

### Day 2 — 2026-09-02: the slices, the chrome, two locales

All 17 slices landed across batched PRs (#14, #16, #18, #20, #22, #24–#27), each
closing with `pnpm verify` green and an axe violation count. That count meant less
than it read: **the axe gate audits the fixtures page, not the site** — a fact not
established until day three.

Models and the custom type were pushed to Prismic **without the Slice Machine CLI**,
using the Custom Types API with the site's own `.env` token. `@slicemachine/manager`
works too but needs a `~/.prismic` login that had lapsed. Documents were authored
from the curated `mocks.json` payloads; **publishing stayed a human step in the
dashboard** and still is.

**The chrome is not a slice.** The footer renders from `site-config.json` through
the layout, so an author cannot reorder or remove it. The nav has no ground of its
own — it is transparent and fixed, and `$lib/nav-tone` maps the page's first slice
to the comp's variant.

**Two locales, one route tree.** English is master at bare paths; Spanish is `/es`,
through the optional route param `[[lang=lang]]`. `/en` is deliberately not a URL.
Prismic's ids (`en-us`, `es-mx`) never reach a URL.

**The chrome names a page, not a path — and a build failure forced it.** Removing
the `your-prismic-repo-name` sentinel re-armed loud-fail prerendering, and the
crawler follows every internal link it renders. A hard-coded `/about` in the nav
**fails the build** the moment that page is not published in the request's locale.
So chrome items carry a page reference and `loadSiteConfig(lang, publishedUids)`
links one only when its page is live. Add a chrome item for an unpublished page and
it costs nothing; hard-code its path and the next build fails.

**A stacked PR was lost to a deterministic GitHub behaviour.** #15 was stacked on
#14's branch because both touched the same generated files. Merging #14 deleted its
branch, GitHub auto-closed #15, and a closed PR whose base is gone **cannot be
reopened**. Re-pushed as #20.

**`DonationForm` was built to the comp and hidden the same evening**, behind a
`show_form` Boolean defaulting off. LGL's engine was measured for whoever wires it:
a multipart POST to `/form_engine/<id>`, but carrying a reCAPTCHA on LGL's own
domain-bound site key, a Rails authenticity token, and three required fields the
comp lacks.

Review rounds 2 and 3 landed here — the language switch that does not reload (a
view transition over a plain Kit link), the overlay recoloured to the menu's dark
green, and transitions required to earn themselves: _"only if we actually need it
for loading."_

---

### Day 3 — 2026-09-03: the measuring stick, built after the site

At 00:01 Tucker asked: _"is the site ready for my review against figma to your
mind?"_ Every one of the 17 slices had already been built, tested, axe-gated and
merged. The answer was `scripts/figma-compare` (#28) — comp geometry from Figma's
REST API, the rendered site measured the same way with Playwright, matched by text
content — followed immediately by #29, #30 and #31, **one per page, re-doing layout
and type on pages already called done**.

The harness found two comp facts no screenshot can show, and they drove most of the
deltas:

- **Figma trims Pragmatica Extended text boxes to cap height and baseline.** A 12px
  label reports an 8px box, a 60px line a 42px one — so every gap the comp specifies
  is cap-to-baseline. That single fact is why the footer's rows sat 46px apart
  against the comp's 38. The `t-*` utilities in `app.css` exist to encode it.
- **The comp pins bands as prototype sticky scrolls** — the whole slide-over
  behaviour of the homepage and Who We Are, which nothing in the per-slice loop had
  looked for.

Once measured, the fixes were precise: #29 lands every band within a pixel or two
(lead paragraph 216 vs 217, columns 985/985, stats card 327/327, closing panel
472/472). Nothing was learned that a Stage-A harness could not have supplied on day
one.

**Then nine PRs on one mechanism, two of them reverting the one before.** #33 gave
the closing statement a `min-h-dvh` band; round 4 answered _"the bottom is just
where it anchors, it shouldn't grow that much"_ and #34 reverted it, moving the
resting edge instead. #35 superseded #34's own fix, which had been inflating the
stats band's measured height — the number the stack maths is built on. #36 answered
_"there's a little gap that lets us see through to the image behing"_: `offsetHeight`
rounds to whole pixels and the real bands are 327.61 and 301.81, so every joint was
off by a fraction; a two-colour probe caught **5,404 device pixels** of the
photograph at 1366×768. #40 gave the navy band a viewport minimum; #41 reverted it —
"the space was on the wrong section, and it cost a screenful of dead navy
mid-scroll" — and paid the shortfall as `--cover-slack` below the closing line
instead, matching Nicole's screenshot exactly (1151px of viewport, a 204px strip).
#47 then found every band had been holding at `top: 0` under a 70px fixed bar, after
Tucker said it in plain words.

**The Spanish site answered in English three separate times, on three different
mechanisms.** #34: everything the chrome supplies itself — skip link, "Open menu",
the dialog's name — fixed by `$lib/ui-copy`. #42: the 404 page rendered the string
`error(404, …)` was given, written for a log; the contact action froze its English
copy at construction, so one action could only answer in one language; the footer
said "Contacto" where the client's own copy says "Contáctenos". #45: native
constraint validation speaks the **browser's** language and puts it in a bubble that
is not in the accessibility tree at all. Three passes, because each was found by
looking at a different thing rather than by one rule applied once.

**`app.html`'s comment ate the whole head — twice.** #43 added a comment mentioning
`%sveltekit.head%` by name. SvelteKit substitutes the first occurrence and only the
first, so the comment took the entire head and the real placeholder rendered as
literal text; the injected markup then broke the comment open, because it carries a
hydration marker that is a comment that ends. On every page: leaked text at the top
of `<body>`, `#main-content` pushed down 24px, two canonicals, two descriptions. The
first attempt at the fix **reproduced the second half while explaining the first** —
the reworded comment contained a comment terminator and spilled 19 head tags into
the body. Same defect class, twice, an hour apart, the second time in the act of
documenting the first. `pnpm verify` was green through both: it is not a console
error, not an axe violation, not a type error.

That fix also uncovered a green test that was green for the wrong reason — the 404
smoke test had been passing _because_ the head was broken; with `<title>` correctly
back in `<head>`, an unscoped `getByText("404")` matched the hidden title instead of
the visible `<h1>`.

**Mobile is not the comp scaled down.** Four full-bleed measurements held only at 1440. `heartEndPct` replaced a hard-coded 187.2%: the comp's open mask is 2696×2352
on an 860px band, so what it really fixes is the heart at **2.735× the band's
height** — the comp's own band still computes 187.2%, and a 390×664 phone needs
~534%. Full-bleed photos were being center-cropped _and_ magnified 2.8×, turning the
about masthead's embrace into a forehead.

---

### Day 4 — 2026-09-04: no scripts, and Turnstile

**Three PRs in 69 minutes, each merged before the next defect was found.** #51 at
23:12, merged 23:16. #52 at 23:28, merged 23:44. #53 at 00:11, merged 00:21 — its
commit opens "Follow-up to #52, which merged before these landed." One defect class:
a value or element only JavaScript supplies, rendered as if static. Both 260vh
runway stages rendered frame 0 without a script. `CountUp` showed "0+", "0 people",
"0%", "0 lives" — the `sr-only` sibling carried the truth, which is exactly why
nothing could see it. `PersonGrid`'s bios existed only inside a pop-up a click
creates, so they were absent, not hidden. The bio was still clipped after #52, losing
166px below an `aspect-square` card's `overflow: hidden`.

Two structural blindnesses hid all of it: the shared Playwright config forces
`reducedMotion: "reduce"` on every test, which collapses both runways through the
components' own media query — so a no-JS test **passes on a page with no fix at
all**. And opacity does not inherit as a computed value, so the `<h1>`'s own is 1
while it is completely invisible.

The most instructive failure in the build is in #53. Three coupled class names have
to agree across the component, `app.css` and `app.html`. A review harness renamed
`.countup-nojs` as a mutation test and **nothing caught it** — the unit suite stayed
green, and so did the no-JS smoke tests, because with no script the noscript rule
hides the other layer and the renamed one is the only thing painted. The first guard
written for it named the class in its selector and passed the mutation happily: a
renamed class simply stopped matching, so the test measured one element and found
one.

**Turnstile produced the richest cluster of false confidence in the build.** The
obvious first move — copy `TURNSTILE_SITE_KEY_1` from the fleet's `.env` — was the
trap: that widget has been full at Cloudflare's 10-hostname cap for weeks. A sitekey
served from an unlisted host throws an uncaught `110200`, renders no iframe, and
mints **no token at all**.

Three independent guards reported healthy through that. `/health` said
`forms.turnstile: true`, because it is a truthiness check on the env var that never
contacts Cloudflare — and that boolean alone fed the `Turnstile widget` column,
satisfying both halves of the guardrail meant to catch it. And the smoke suite
applied `ALLOWED_CONSOLE_PATTERNS` — which lists Turnstile by name — to `pageerror`
as well as console output, discarding the uncaught throw. #54's commit puts it
plainly: _"This suite watched exactly that ship today and stayed green."_

Then three corrections in 24 hours, each to a claim written that morning. #691
asserted that `form-e2e` swaps in Cloudflare's test sitekey so the real widget never
renders under the probe. #693 corrected a runbook written hours earlier — its browser
check said a healthy widget has an `iframe` child, but the fleet's widgets are
invisible mode, and a healthy VLF widget was measured with **zero iframes and a valid
773-character token in the same instant**; following the old text, an operator
condemns a working widget. #694 then found #691's claim outright false:
`CF_TEST_SITEKEY` reaches exactly one expression — the fake token _value_ — and
nothing writes `data-sitekey`. The real widget renders with the real key on every
nightly run against six live contact forms. _"The probe is generating the evidence
and discarding it."_

---

### Day 5 — 2026-09-05: what a launch audit found

A six-lens audit with adversarial verification found the launch blocker nobody had
filed: **all six photographs on the live site are watermarked iStock comps**,
including the home hero. Verified by eye. Recorded in the repo since 09-02 in exactly
one place — a code comment on the fixtures page — and in no issue and not in
CLAUDE.md's numbered "what is NOT done" list, which are the two places a launch audit
reads. Now issue #56.

The same night, #55 closed three gaps that had all been measuring nothing for days:
the axe gate ran over two dev fixtures and no real page (`pkg.reddoor.a11yRoutes`
absent — all eight real routes measured **0 violations** on the first run); the smoke
manifest never grew past the starter's three routes; and `/contact` and `/es/contact`
were missing from `sitemap.xml`.

The a11y gap had been **found and documented two days earlier** — #44's commit says
"The axe gate never audited a real route… CLAUDE.md implied wider coverage.
Corrected" — and #44's changed files are CLAUDE.md, fixtures and components.
`package.json` is not among them. The finding was written up as a doc correction and
left. The real fix was eight strings.

One correction to a claim made in that audit: `forms-notify-target` printing
`OPERATOR ONLY` was read as a missing client contact. It is not. The record already
carries `brooke@vidalegacy.org`, and `resolveRecipients` short-circuits on
`status !== "maintained"` **before** it reads that field, so the output is
structurally incapable of naming the client pre-launch. Nothing was outstanding
there.

---

## What to change for the next site

Forward-looking recommendations, not history — kept here because the evidence is
above. Ordered by what they would actually have saved.

### 1. Build the comp-measuring harness at Stage A, before the first slice

`scripts/figma-compare` was built on day three, after all 17 slices were merged, and
immediately cost #29, #30 and #31 — re-doing pages already called done — plus nine
PRs on the sticky-band mechanism it should have specified once.

The two facts that drove nearly all of it are invisible in `get_screenshot` and
absent from `get_design_context`'s output shape: **Extended text boxes trimmed to
cap height**, and **prototype sticky scrolls**. Both are extractable from the
design's own data on day one.

`/figma-slices` Stage B step 5 currently reads "the operator reviews the Netlify
deploy preview" — a human-eye gate, for a client whose standard is "match the comp
within a few pixels." **The skill's definition of done contains no measurement at
all.** Move the harness into Stage A and add a numeric parity gate to the definition
of done, or this recurs verbatim on the next comp.

### 2. Point the gates at real routes at bootstrap

For four days the axe gate audited `/dev/a11y-fixtures` and `/dev/animate-in` and
nothing else, and the smoke suite covered three of eight routes. Every slice PR said
"axe 0 violations"; all of them meant the fixture passed.

The fleet's own comment on `a11yRoutes` records that the key exists "because scanning
only fixtures let a critical `image-alt` violation ship to five production pages with
CI green" — a lesson already paid for on a prior site, repeated here because the key
is opt-in and **nothing in `/new-site` sets it**. Set both lists at bootstrap and
grow them as routes land.

### 3. A pass must require positive evidence, never the absence of an error

The single most expensive pattern in the build. `/health`'s `forms.turnstile` is a
truthiness check on an env var, and it was allowed to mean "the widget works."
`rendered` meant "the mount point is in the DOM," which the starter emits whenever
the env var is set. Each time, the fix reintroduced the same shape one step along —
the last one survived by exactly one error code.

State it as a rule: **an error matcher may only ever deny a green.** A pass requires
an artifact only a working system produces — a 2xx for the script, a minted token, a
real submission traced end to end. And a field that can only observe configuration
must never be named after the thing it cannot observe.

### 4. Enumerate the defect class before fixing an instance

Four PRs on no-JS, three of them in 69 minutes, each merged believing it had closed
the class. Four PRs on Spanish, each found by looking at a different thing. Two
shipments of the placeholder bug, an hour apart. Nine PRs on sticky bands.

When a defect is found, the next question is _what else is in this class_ — every
value a script supplies, every string the CMS does not write, every
`%sveltekit.*%` placeholder. Enumerate, then fix once.

### 5. Anything found and not fixed in the same PR gets an issue

The `a11yRoutes` gap was correctly diagnosed on day three and written up as a
documentation correction; the eight-string fix waited two more days. The watermarked
photography lived in a code comment for four days and became the largest launch
blocker. Neither was in a tracked list.

A doc correction is not a fix, and a code comment is not a tracker. If it is real and
not fixed now, it is an issue with a described fix — otherwise a launch sweep will
miss it, and one did.

### 6. Treat a coverage claim as a claim about code

"The suite covers this" is a statement about a file and must be made by reading that
file. Three claims in the Turnstile work were written and found false within 24
hours, including one that a probe swapped the sitekey when it demonstrably did not.
Documentation written in the same session as the fix is a hypothesis, not a record.

Corollary, learned the hard way: **write the test that fails for the reason you think
it fails, by breaking the thing on purpose.** A guard naming a class in its selector
passed a rename happily. And check what the shared harness forces — `reducedMotion:
"reduce"` made a whole class of new tests vacuous while they passed.

### 7. Do the locale inventory the day the second locale is decided

Spanish was decided on day two and the route tree landed the same day; English then
shipped to Spanish readers three more times, in three different layers. The rule now
in CLAUDE.md — anything a visitor can read that Prismic does not write is code —
was written afterwards, and nothing enforces it.

Also: author the second language by **mirroring comparable sites in that language**,
not by translating. Tucker had to say so: _"en linea sounds very literal to me, find
a similar site and mirror their spanish for things like this."_

### 8. Record what a review note was _not_ about

The note _"still the wrong stock photo"_ was actioned correctly — the image the
client wanted replaced the one they didn't. The replacement was itself a watermarked
comp, and the round closed cleanly on its own axis while leaving the larger problem
in the same asset untracked for three more days.

Relatedly: a client note names **where they saw it**, not what causes it. Fixing at
the reported location produced two full reversals in two days.

### 9. Branch per batch, and keep in-flight state outside the transcript

`PR #10` was squash-merged while commits were still landing on its branch, orphaning
them with no CI. `PR #15` was stacked, auto-closed when its base was deleted, and
could not be reopened. Both are deterministic, not judgment calls.

Across the build there were five interruptions — two session limits, a model
handover, a context exhaustion, and a crash — and Tucker asked what was running
three separate times. That is the signal that in-flight work had no durable readable
home. This journal is part of the answer; a short "in flight" section in the session's
own notes is the rest.

### 10. Verify on a production build

Some defects are not merely invisible on the dev server — it **actively hides**
them. The no-JS runway bug needs a real build; the font path loads by a different CSP
directive in dev than in prod, which is why issue #6 is still open. It is the last
of the four issues filed on day one that has not been closed.
