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

> Superseded in part by 2026-09-05 — the retrospective checked against the
> field. Building it early still holds; building it OURSELVES is the part that
> did not survive contact — three off-the-shelf tools do this, one of them
> free. See [process-review.md](./process-review.md).

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

> Superseded in part by 2026-09-05 — the retrospective checked against the
> field. This rule has a name — mutation testing — and as of #61 the repo
> measures it rather than aspiring to it. See
> [mutation-audit.md](./mutation-audit.md).

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

> Superseded in part by 2026-09-05 — the retrospective checked against the
> field. The corollary — break the thing on purpose — is mechanised in #61,
> and it caught this session shipping a vacuous test within the hour of
> restating it.

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

> Superseded in part by 2026-09-05 — the retrospective checked against the
> field. Not merely unimplemented: BOTH browser gates run `npm run vite:dev`,
> so the harness that enforces the other nine contradicts this one. Filed as
> reddoor-maintenance#700.

Some defects are not merely invisible on the dev server — it **actively hides**
them. The no-JS runway bug needs a real build; the font path loads by a different CSP
directive in dev than in prod, which is why issue #6 is still open. It is the last
of the four issues filed on day one that has not been closed.

---

## 2026-09-05 — the retrospective checked against the field, and three of its rules made mechanical (#61, #62, starter#116)

The entry above is the inside view: ten recommendations drawn from our own
defects, written with no reference to how anyone else solves the same problems.
This is the outside check — eight research agents across four angles, every
claim verified against this repo rather than taken on report — and then the
three highest-value recommendations actually implemented, so the review rests on
evidence rather than intent. [process-review.md](./process-review.md) is the
full document; this records what it cost and what it corrected.

**The most useful finding came from the checker.** An agent asked how the field
stops coding agents making confident false claims reported that this repo's
`CLAUDE.md` still carried the stale paragraph about the axe gate scanning only
`/dev/a11y-fixtures`. It does not — `a11yRoutes` landed in #55 and the paragraph
is gone. The agent had reasoned from the retrospective text in its own prompt,
which describes the pre-fix state as history, and never opened the file. A
report about hallucinated completion claims, containing one, from an agent told
in its own brief that this was our number-one failure mode. The check costs one
grep.

**Recommendations 3 and 6 have a name, and it is fifteen years old.** _A pass
must require positive evidence_ and _break the thing on purpose_ together
describe mutation testing. Four days of hand-derivation, one defect at a time,
for a technique with mature JS tooling since 2010. `pnpm test:mutate` (#61) now
runs it, deliberately outside `verify` and CI: nine minutes, and the output is a
reading list rather than a pass.

The first run scored **81.21%** — 1,219 mutants, 989 killed, 191 survived, 38
never reached. The headline is fine and beside the point. `src/lib/turnstile.ts`
scored **40 with no unit test at all**: the module at the centre of the whole
positive-evidence lesson, whose misconfiguration buckets every real lead as
spam, was the lowest-scoring file in the repo. Its entire `onerror` handler
could be emptied — which leaks a dead `<script>` into `<head>` AND never clears
the cached promise, so one network blip disables the widget for the life of the
page — with nothing red. `/health`'s `prerender = false` could be flipped to
`true`, freezing the endpoint the fleet polls into a build-time snapshot
reporting `ok: true` forever. And `/health`'s `.trim()` on the sitekey is
documented in a comment as making a whitespace value "report dark here too";
dropping it survived, because every fixture used a well-formed key — which is
recommendation #6 catching itself. Six files went from ~50% combined to 94.44%;
#58–#60 hold the rest.

**The strongest datum of the day is a test that passed when it should not
have.** Building the rendering matrix (#62), the no-JS heart assertion was
break-tested by deleting `mask-size: auto 273.4919%` from `app.html`. It stayed
green: the `-webkit-mask-size` line directly above still supplied the value. The
assertion was vacuous, written and about to be committed by the same session
that had spent the morning putting "break the thing on purpose" into three
repositories. The rule is not aspiration and it is not automatic — it caught its
own author within the hour. Removing both declarations reds `no-js` and
`phone-no-js` and leaves the scripts-on cell green, which is correct.

**Eleven invariants now run in four cells instead of one.** Every no-JS and
reduced-motion-phone defect this site shipped was found by hand, and its test
then lived in the single cell where it was discovered. "The heart covers the
band" ran only at 390×664; "the stats are not zeros" only without scripts; "the
heading is painted" only on the desktop no-JS page. All three are true of every
rendering state. `tests/smoke/rendering.spec.ts` holds them with no `test.use`
of its own and `playwright.config.ts` runs it across {desktop, phone} ×
{scripts + reduced motion, no scripts + full motion}. 22 tests became 67.

Not all four combinations of those axes, deliberately: a visitor with scripts
and full motion sees frame 0 for two seconds by design, so "the heading is
painted" is false of that state on arrival and asserting it would be wrong
rather than strict.

The heart check had to be rewritten to get there, and it is now the only thing
that measures the no-JS claim in a browser. The two halves express the mask
differently on purpose — `<pct>% auto` with scripts, `auto 273.4919%` without —
and CLAUDE.md argues they are algebraically identical at every aspect. Nothing
could check it, because parsing the first token as a width is a NaN on the
no-JS form.

**Aria snapshots, not pixels.** `tests/__aria__/` holds ten accessibility-tree
snapshots of the chrome: nav per route, footer per locale. The tree is identical
on macOS and CI's Linux, where font rasterisation differs enough that a
screenshot baseline needs a container or a tolerance; it is text, so it reviews
in a PR. Verified against the bug class that actually shipped here — swapping
`openMenu: "Abrir el menú"` for `"Open menu"` reds `/es` with a one-line diff,
and English reached Spanish readers three separate times on this build, each
round found by eye. It would **not** have caught the head-in-`<body>` bug:
`<meta>` and `<link>` are not in the accessibility tree. Worth saying, because
the temptation is to claim a new gate covers the last defect that hurt.

**Recommendation #10 is worse than unimplemented.** Both browser gates —
`configs/playwright-a11y` and the a11y audit's synthesized config — start the
system under test with `npm run vite:dev`. So the harness that enforces the
other nine contradicts this one, and all 67 assertions in the new matrix inherit
it. Observed live in a run today: the dev server fires a `connect-src` CSP
violation for the Typekit stylesheet that production does not, which is issue #6
— open since day one and uncloseable by a gate that runs in dev. Filed as
reddoor-maintenance#700, and it is now the ceiling on everything else here.

**Beliefs corrected on contact.** Two, both mine.

The parity harness is a **commodity**, and I briefed the research on it as our
most distinctive asset. uiMatch does the same job open-source with a fidelity
score, ΔE2000 colour and CI exit codes; Fidel sells the architecture as a $29
GitHub Action; Uiprobe went free in April; Figma has acquired the leading
open-source visual-diff team. Ours is 542 lines across six scripts, of which the
comparator is 121, with no score, no threshold and no exit code. Recommendation
#1 — build it at Stage A — stands on its own evidence. _Build it yourself_ does
not. The one genuinely novel piece is the cap-height trim, which no tool in the
field documents, and which is worth writing up publicly.

And the thing we are actually ahead on got one sentence in the research, filed
under "secondary": the corrected trap corpus plus this journal, read by an agent
before it acts. Cline's Memory Bank — the closest widely-used equivalent —
rewrites `activeContext.md` every session and would have compacted the
white-on-green correction away the first time it stopped being active context.

**Honest accounting, and it points at this file's sibling.** `CLAUDE.md` is 963
lines, ~13K tokens, loaded into every session whatever the task. The only
measured study of that artifact class (Gloaguen et al., ETH Zurich,
arXiv:2602.11988, Feb 2026 — 138 tasks, four agents) puts developer-written
context files at **+4% task success for +19% inference cost**, and concludes
that unnecessary requirements in them make tasks harder. The archive is worth
having; keeping all of it always-on is not. Which cuts directly against what
this session spent its morning doing — adding the journal convention to that
file across 39 repositories. The rollout was still right. The size of this
particular file is a separate problem and it is now the largest one on the list.

**One claim withdrawn before it shipped.** The starter PR said journal entries
are anchored to "a PR under branch protection and a green `pnpm verify`." This
retrospective established that a `pnpm verify` pass was granted on the absence
of an error string, and that the axe gate audited no real page for four days
while every PR reported 0 violations. An anchor to a gate that demonstrably lied
is the appearance of provenance, which is worse than none. It is not in the
merged text.

**The journal rule was half a mechanism.** It says a superseded entry is never
rewritten — a later entry corrects it and names which one — which puts the
correction at the bottom of the file and leaves nothing pointing to it from the
paragraph a reader lands on. Forward pointers close that, and four of the ten
recommendations above now carry one. A pointer is navigation, not content: the
prohibition is on editing the claim, and a pointer makes no claim. Rolled out to
33 fleet repositories today (starter#116). The evidence it was needed turned up
by accident — `a-budget`'s `CLAUDE.md` was already doing it by hand,
uncommitted, in a working tree nobody had committed from: `**SUPERSEDED WHILE IN
DEBT PAYOFF — see "Envelopes: pure retroactive" below.**` Somebody hit the
problem and invented the fix locally, which usually means a convention is
missing rather than a person is wrong.

**Not done, and why.** `a-budget` is the one repository of 34 that did not get
the forward-pointer paragraph: its `CLAUDE.md` had uncommitted changes modified
two hours earlier, and moving the remote branch under a possibly-live session is
exactly what the concurrent-sessions rule exists to prevent. It needs one small
follow-up once that work lands.

## 2026-09-05 (evening) — CLAUDE.md split, uiMatch tried for real, and the trim turns out to be per style (#64, #65)

Three of the review's own recommendations, done the same day, plus the fix for
a failure that had nothing to do with this site.

**CLAUDE.md is 297 lines, from 1,006 (#64).** Every moved section went verbatim
into `docs/` — brand, layout, rendering, locales, forms are new; security and
accessibility took appended sections — because the review's finding was that
the corpus is the asset and the always-on file is the cost. What stays is what
a session must not violate, plus twelve one-line site rules under Traps, each
linking to its evidence. The split ran as a script with line accounting and
failed once: the `## 2026-09-04` _example_ inside the journal section's code
fence parsed as a heading. Nothing had been written; the parser is fence-aware
now. One thing surfaced by doing it: the a11y-gate paragraphs had lived inside
"Brand colours" since the day they were written, because contrast is what axe
measures. They are in accessibility.md, where a session looking for the gate
would look.

**uiMatch, evaluated by running it, not by reading about it.** 0.4.0 from npm
(1,429 downloads last month; 15 stars; "Experimental / 0.x … not
production-ready" in its own README; last npm publish 22 July, repo pushed
today). Against this site's production build, three comparisons.

Every first run failed on `UIMATCH_IMAGE_SIZE_MISMATCH`, for two reasons that
are not in the quick start: the default is `size=strict`, and the viewport is
derived from the Figma render's _pixel_ width — 2880 for a 1440 frame at 2× —
so the implementation was captured at 5760. `viewport=1440x860 size=pad` is the
incantation. Twenty minutes to learn it.

With it: the nav scored 31/100 at 96.5% pixel diff, which is the ground — the
Figma node is exported on cream and ours is transparent over the green hero —
plus the EN | ES toggle the comp does not have. The tool cannot separate "wrong
ground" from "wrong layout". The donate page scored 69 with a **46.1% area gap**,
and that one is _correct_: the comp draws the on-page form, we ship it hidden
behind `show_form`, and the gate failed on exactly the deliberate difference it
should fail on. Then the part that decides it: the only typography finding on
the page's `<h1>` was `font-family: "pragmatica-extended…" vs "Pragmatica
Extended"` — Adobe Fonts' slug against Figma's display name, flagged
`autoFixable: true`. A false positive, and **no size, line-height, tracking or
position delta of any kind.** Its style layer is a computed-CSS string compare;
`styleFidelityScore: 0` on a page that is a few pixels off.

Two more, both about this site rather than the tool. `textMode=descendants`
collected "Español Español Who We Are Donate Contact Us Become a Donor" from the
nav — the no-JS menu list, in the DOM and hidden — while the Figma side was
empty, because the wordmark is vector. And a screenshot of `main` contains the
**footer**, because `main::after` grows by `--footer-h` and `main + footer` is
pulled up over that spacer for the sticky cover. Any element-screenshot tool
inherits that here.

Verdict: a pixel regression gate with exit codes, which works and which we do
not have; not a typographic diagnosis, which we do have and it does not. The
review's "commodity" line was half right — the score-and-gate half is
commoditised; the per-run cap-height-aware comparison is not in it. Not adopted:
for three pages the setup traps cost more than the gate returns, and it has no
component surface to point at. Revisit at 1.x, or if the slice simulator ever
serves stable URLs. A forward pointer sits on the review's harness section.

**The trim is per style, not per family — and the API says so.** Pulling the
donation and home frames from the REST API today and grouping single-line text
nodes by style: Pragmatica Extended 300 at 60px reports a **42px** box on an
81px line-height; 36px → 25; 18px → 13; 12px → 8. Ratio 0.667–0.722, which is
the face's cap height (≈0.70em) rounded to whole-pixel boxes. Each carries
`style.leadingTrim: "CAP_HEIGHT"`. And the 10px field labels are Pragmatica
Extended too, box = 15 = line-height, no `leadingTrim`. CLAUDE.md said "Figma
trims its Pragmatica Extended text boxes" from day three until this afternoon;
the belief was one level too coarse. **The harness did not record the field.**
`pull-figma.mjs` saw the 42px box and could not say why; it records `trim` now,
here and in the starter.

`text-box: trim-both cap alphabetic` — the CSS side, already in six `t-*`
utilities — reached Baseline newly-available in late August: Chrome/Edge 133,
Safari 18.2, Firefox 154 (18 August 2026). Two weeks ago. The write-up is
[figma-cap-height-trim.md](./figma-cap-height-trim.md), built entirely from
today's measurements so it can be published without a caveat.

**And the archived-repo failure, fixed where it recurs.** Three sessions have
run a fleet sweep to completion and found at push time that `reddoor-mailer`
and `the-pointe` reject writes — and this one reported the cause wrongly as
"dead remotes"; both remotes answer, both repos are archived, and from inside a
clone those look identical. `scripts/fleet-repos.sh` in reddoor-maintenance
(#701) answers it before the work: one `gh repo list` per owner, 3.9s for 39
checkouts, bash 3.2 because that is what macOS ships. A five-line
`~/.claude/CLAUDE.md` points at it, so a session in a site repo learns it too.
The script also found that the checkout `welcome-to-the-flower-court` is
`tucksravin/invitations` — directory and repository names are not the same
thing, and a sweep assuming they are addresses the wrong repo.

**Not done.** `a-budget` still lacks the forward-pointer paragraph, for the same
reason as this morning.

## 2026-09-08 — The hero's dark overlay stops at the heart, not the green (#66)

Nicole, on Discord yesterday: "could the dark overlay on the homepage masthead
only apply to the image, not the green cutout?" One note, and the whole session.

`HeartHero`'s legibility scrim was a **sibling** of `.heart-mask` — `absolute
inset-0` over the stage — so it covered everything the stage painted. At rest
the heart is 46.49% of the band, which means the other ~85% of the frame is
`--color-green`, and the scrim was laying a 0.52-alpha gradient across it. The
green went to a muddy olive toward the bottom. That is a flat brand fill the
comp never darkens, and it had been shipping since the slice was written.

The fix is one move: the scrim goes **inside** `.heart-mask`. A CSS mask applies
to everything an element paints, children included, so the scrim inherits the
heart's size and position for free — in every frame of the opening, and in the
scriptless one, where app.html's noscript block overrides `mask-size` and
`mask-position` on `.heart-mask` alone. The alternative was duplicating the mask
rules onto `.hero-scrim`, which would have meant moving `--heart-size` /
`--heart-y` up to the stage AND adding a second selector to the noscript block —
two more places to keep in step with a geometry that is already derived in three
(the component, `heart.ts`, and a hard-coded 273.4919% in app.html). Containment
needs none of them.

**The copy was never at risk, and it is worth writing down why**, because the
scrim exists for exactly one reason and it looked like this change removed it.
`COPY_AT` is 0.6; `HEART_OPEN_THROUGH` is 0.55. The copy is revealed _after_ the
heart is fully open, and `heartEndPct` guarantees an open heart covers the
stage at any aspect. So the scrim is under the copy in every frame the copy
exists in — it can only be clipped away where there is no copy.

Proved rather than argued. Before/after captures at three scroll positions on
1440×860 and 390×664, diffed per pixel:

| viewport | rest                 | mid-open (0.3) | open (0.8) |
| -------- | -------------------- | -------------- | ---------- |
| 1440×860 | 47.09%, rows 342–859 | 14.43%         | **0 px**   |
| 390×664  | 53.17%, rows 264–663 | 0.14%          | **0 px**   |

Every changed pixel is the green under the gradient; the open frame is
byte-identical on both. The ground at the bottom-left corner at rest goes
`#404e28` → `#87a353` (brand green under the grain layer); the photograph inside
the heart at the same moment is `#635b5c` in both, delta `0,0,0`. The phone's
mid-open number is 0.14% and not a bug: `heartEndPct` gives a 390×664 stage a
533.76% heart, so by 0.3 of the runway it has already covered nearly everything.

**Two harness lessons, both from getting it wrong first.** (1) Reconstructing
the "before" state by reparenting the scrim in the live DOM is not the same
experiment: `appendChild` puts it _after_ `.hero-copy`, so it painted over the
heading and the first probe read a cream glyph as if it were the ground. Even
`insertBefore` the copy still reported 2–3% of the frame differing, all of it at
glyph edges, because the two captures were separated by a scroll that had not
settled to the same integer y. A `git stash` A/B — two clean page loads of two
real code states — answered in one run what three rounds of DOM surgery had
muddied. (2) A screenshot pair is only evidence if the thing you are measuring
is the only thing that moved.

**What was NOT run, and why it does not matter here.** `pnpm test:mutate` is a
session gate, but Stryker's `mutate` globs in `stryker.config.json` are `.ts`
only (`src/lib/**/*.ts`, `src/params/*.ts`, `src/routes/**/+server.ts`). This
change is a `.svelte` file and its test; `heart.ts` is untouched, so the
mutation score is structurally incapable of having moved. The aria snapshots
did run — they are inside `pnpm test:smoke`, and `pnpm verify` is green
end to end.

The no-photo case keeps the full-bleed scrim in an `{:else}`. Without an image
there is no heart to clip to and the copy would sit on bare `--color-green`,
where cream is 1.94 — the one thing brand.md says this design never does. The
scrim carries the bottom of the band back to ~4.5, so losing it in the else
branch would have been a silent contrast regression axe cannot see, because the
a11y fixtures render the slice with its mock image.

## 2026-09-09 — Nicole's second review round: four notes, and one of them was a bug the comp had been blamed for

Four notes from Nicole in `#vida-legacy-foundation`, two with phone
screenshots. Taken together in one branch because they are one review round.

**The (+) that opened nothing.** She asked to "disable the (+) button if a bio
does not exist". The first read of this was that it _overrode_ the comp, because
`PersonGrid` said so in a comment: the comp draws a "+" on every leadership card,
and `opens()` was `!board || isFilled.richText(p.bio)` — deliberately true for
every leadership card, bio or no bio, with the reasoning that a bio not yet
written would open to "the name, role and address alone". Following that through
the component is what corrected the belief. The pop-up's bio block is guarded by
`isFilled.richText(current.bio)`, so a card with no bio opened a dialog
containing the name, the role and the email — the three things already printed
on the card face — and the trigger announced itself as "Read the bio for
&lt;name&gt;" on the way in. That is not a design decision being overridden; it
is a dead end, and a broken promise specifically to a screen reader. The comp
puts a "+" on every leadership card because in the comp every leadership person
_has_ a bio; the bio-less card is a content state it never drew. Nobody on
/about has a bio today, so this was all three leadership cards, live.

`opens()` is now `isFilled.richText(p.bio)` and the `board` distinction leaves it
entirely — both styles say the same thing, which is what the board rule already
said.

**What that broke, and why the breakage was the good news.**
`tests/smoke/pages.spec.ts` had `/about hides the controls that cannot open a
bio`, and it went red — not on the hiding, but on its own floor guard
(`[data-bio-toggle] matches nothing — has it been renamed?`). /about now renders
no bio controls at all, because nobody there has a bio. The guard exists because
"none are showing" is also true of a selector matching nothing, and it did
exactly the job it was written for. The test now loads `/dev/a11y-fixtures`,
which is the only rendered bio on the site, the same page its sibling test
already used.

**The square cards.** "Height of the box matches height of content instead of
being a perfect square. Too much real estate for the names." A photoless
leadership card was `aspect-square`, and with `headshots` off at launch that is
every leadership card — a name, a role and an address in the top third of a
full-bleed square. Measured at 390px before: 327×327 with 119px of content, so
64% of the card was empty. Now `sm:aspect-square`: 327×119 for Brooke and Vilma,
327×143 for Holly (two-line role), and the comp's square returns at `sm` where
the cards are two and three up. The board card is untouched at `min-h-[200px]`.

**The sticky that ate the paragraph.** The mission band is a `sticky-cover`: the
comp pins it and the columns band slides over it. That works while the band's
copy fits on the screen above the band covering it, and on a 390×664 phone it
does not — her screenshot has the paragraph cut mid-word at "and embraced while
connecting" with the columns band already over it. New modifier
`.sticky-cover--from-md`: in flow below `md`, pinned above it. It has to sit
after the base rule in app.css — same specificity, so source order is the only
thing deciding — and that is precisely the kind of fix that can be silently
undone by a later edit, so the invariant is asserted against a real cascade in
`rendering.spec.ts` rather than as a class name. Verified by neutering the
selector and watching the phone cell fail (`expected "relative", received
"sticky"`) while the desktop cell passed.

Deliberately narrow: `ImageBand` is the only other `sticky-cover` and it pins a
photograph, which has no text to clip; the closing statement is bottom-anchored
and rests on its last line by design. Neither was in the note and neither is
changed.

**The about page opening itself.** "could the about page open automatically as
well?" — the same request that gave the hero its opening on 2026-09-03, for the
band that opens /about and /donate. `PageMasthead` already had HeartHero's
runway mechanics; what it lacked was the opening. Rather than copy forty lines,
the auto-open moved to `$lib/utils/autoOpen`: the three decision helpers
(`shouldAutoOpen`, `playedThisSession`, `navigationType`) that were never
heart-specific in the first place, plus a new `runAutoOpen` holding the beat,
the gesture cancel and the easing. HeartHero's effect is now nine lines and
`heart.ts` is back to being about hearts.

One thing that is genuinely new rather than moved: **the mark is keyed by
path**. /about and /donate both draw a PageMasthead, and a single
`vlf:masthead-opened` would have let the first page visited spend the second
one's turn — /donate would sit shut for the rest of the session with no
indication why. `vlf:masthead-opened:${location.pathname}`, and there is a test
for exactly that ("keys the mark per band").

**Why the wiring is unit-tested and not smoked.** None of the four Playwright
cells can exercise an auto-open: `chromium` and `phone` inherit
`reducedMotion: "reduce"` from the shared config, which declines by design, and
both `no-js` cells have no script to run it. That is why the hero's opening
never had a smoke test either. `runAutoOpen` is therefore driven directly under
fake timers, and `PageMasthead.test.ts` asserts only that the slice is wired to
it and finishes past `COPY_AT`.

`pnpm verify` green end to end. Measured after, at 390px: the band computes
`position: relative`, and the mission paragraph's bottom is 489 of a 664
viewport — it fits with room to spare.

**One thing looked wrong and was not.** The phone screenshots show a 15px cream
strip down the right edge: `main` is 375 wide in a 390 viewport. That is
`scrollbar-gutter: stable` (app.css) reserving room for a classic scrollbar in
headless Chromium — `scrollWidth` is 375 against a 390 `clientWidth`, so nothing
overflows, and a real phone with overlay scrollbars shows none of it. Nicole's
own screenshots have the green going edge to edge, which is the proof.
