# Layout — matching the comp, the chrome, and what mobile is not

The review standard is "match the Figma" at the comp's 1440 width, within a few
pixels, with responsive lenience — and it is measured with
`scripts/figma-compare/`, not eyeballed. Two comp facts decide most of it and
are invisible in a screenshot: Figma trims Extended text boxes to cap height,
and the prototype pins bands. Everything below follows from those. The rules a
session must not violate are one line each in `CLAUDE.md` under Traps.

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
  on the homepage that is the full-bleed photograph. Since the clear rule
  below made the navy band a viewport tall, the stack now reaches the top on
  that band alone: the frozen screen is a run of navy, "By the numbers" and
  the closing line, and "Compassion in Action" has scrolled off it.
  **The stack is measured fractionally and overlaps by a pixel at every
  joint.** `offsetHeight` rounds to whole pixels and the real bands are
  fractional (327.61, 301.81), so butting the boxes edge to edge left a
  sub-pixel seam that showed the photograph behind — intermittently, because
  a sticky offset is composited. `getBoundingClientRect().height` (falling
  back to `offsetHeight` where there is no layout, i.e. jsdom) plus
  `STACK_OVERLAP` fixes both that and the closing band's own bottom edge,
  which now lands exactly on the viewport's.
- **A pinned band holds BELOW the bar, not under it.** `--nav-h` in app.css
  is the bar's height and the only place it is written: 70px from `md` up,
  and **0 below it**, where the bar leaves once the first section is past —
  there is nothing to leave room for, so nothing is left. `stickyTop` clamps
  a top-anchored band to `min(navHeight, viewport - height)`, so a band
  taller than the room available still holds its bottom edge on the
  viewport's; `coverRun` fills `viewport - navHeight` and pays the closing
  statement only what is short of the BAR's bottom edge, not the screen's.
  **The fill test counts what the stack COVERS, not the sum of its boxes** —
  each joint overlaps by `STACK_OVERLAP`, and summing the boxes let the walk
  stop believing the screen was full while the real top edge was still 1.4px
  short. That exit meets no pinned band, so it pays no slack either. Under
  the bar the hairline was invisible; resting at the bar's edge it showed the
  photograph, at one integer viewport height per width (1440x1018,
  1280x1020, 1024x1086 …).
  **The breakpoint is `768px`, not `48rem`, and matches Nav's own
  `MOBILE_QUERY` exactly.** A rem in a media query resolves against the
  BROWSER's default font size, not the document's, so at Chrome's "Large"
  (20px) `48rem` is 960 while the bar still disappears at 768 — between them
  the bar is present and `--nav-h` would have said there was nothing to leave
  room for. `--nav-h` describes the bar, so it is gated on what the bar is
  gated on. (This is the one place a `rem` breakpoint is WRONG; the Tailwind
  trap above still stands for `--breakpoint-*` theme keys.)
  The CSS falls back to `var(--nav-h)` when there is no measurement (no JS).
  The companion column in `IconColumns` takes it too. The two runway stages
  (`HeartHero`, `PageMasthead`) deliberately do NOT: they are full-bleed, the
  stage IS the viewport, and the bar is transparent over them by design —
  PageMasthead's own window insets already pay the 70 themselves. Holding at
  the top of the screen ate the spacing the comp draws above a band's
  content, and it read as the band tucking under the chrome rather than
  arriving beneath it.
- **A pinned band is only covered by as much of the stack above it.** The
  photograph holds at the top of the screen and the closing stack is the navy
  band, the stats card and the closing line — 946px of it. On a screen taller
  than that, the rest is the photograph, held still across the top of the
  frozen screen for as long as the cream panel takes to roll: "feels weird it
  stops at her forehead", and "can the blue section reach all the way to the
  top before the next section scrolls up?" (Nicole, round 4 — her screenshot
  measures 1151px of viewport and a 204px strip, exactly the shortfall).
  `coverRun` returns that shortfall as `slack` and `stickyCover` writes it as
  `--cover-slack` on the closing statement, which app.css pays as
  **padding-bottom** — height BELOW the line ("I meant below 'hope that heals,
  help that lasts', and should be just enough to cover the image above at the
  top of the screen"). The band is bottom-anchored, so growing it downward
  takes the whole stack up with it until its top edge lands on the screen's,
  and the comp's 60px between the line and the stats card never moves. It is
  paid only when the walk actually ran into a pinned band — run out of
  sections instead and what is above simply scrolls, and freezing a screen for
  it would be wrong — and it is zero at every viewport the stack already
  covers, which includes the comp's own and every phone. Measured after: no
  photograph anywhere in the roll at 1440x760, x900, x1151, 1920x1300 or
  390x664; slack 0 / 0 / 204.4 / 353.4 / 0.

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

## Who We Are ships without photographs, and that is a switch

The comp draws every person card twice — Figma **"Headshot Bio"** (`5312:1454`,
the picture card) and **"Bio Only"** (`5289:1368`, no picture, the name at the
comp's 36/42 display size instead of the 18px label, the badge on the card's
own bottom-right corner at 20/20). The earlier Who We Are frame `5173:1077`
is the whole page in bio-only form, and it is what the site launches with:
VLF has no photographs of its people, and the placeholder was one stock
portrait standing in for four named men — which `PersonGrid` then announced
as that person, because a card's alt text IS the name.

`person_grid.primary.headshots` (Boolean, default **false**) picks the card.
Off is the launch and is also what a document authored before the field
reads, so nothing had to be edited in Prismic. Turning it on when the real
headshots arrive brings back the picture card, the square photo above the
20px-padded block, and the photograph in the bio pop-up — no code follows.
The leadership card is a square, the board card 200px tall, both from the
comp. Both designs are in the a11y fixtures, so axe sees both palettes.

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
