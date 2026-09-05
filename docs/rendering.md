# Rendering states — the hero's opening, and a visitor with no scripts

Both runway stages (`HeartHero`, `PageMasthead`) are driven by scroll progress
that only JavaScript computes, and both had to be made to render their final
frame without it. This is the evidence behind the `<noscript><style>` block in
`src/app.html` and the four-cell matrix in `playwright.config.ts`. The rules a
session must not violate are one line each in `CLAUDE.md` under Traps.

## The hero opens itself

Erik, in the client channel (2026-09-03): "Do we need some sort of indicator
on the hero to scroll down so that people know what to do?" — Nicole: "Or it
opens on its own", and then "i think we can have it open on its own". So
`HeartHero` plays its own opening: two seconds after a visitor lands at the
top of the home page, it scrolls the runway for them over 1.8s, through 80%
of it — past `CTAS_AT`, so the heart has opened and the copy and the buttons
are in — and then hands the scroll back. Any wheel, touch, key or pointer
cancels it on the spot; and a reduced-motion visitor never sees it, because
that hero is already on the open frame. `shouldAutoOpen` in
`HeartHero/heart.ts` holds every condition and is unit-tested; one of them —
the hero must be the top of the document — is what keeps it from scrolling
the a11y fixtures page, which renders a hero half way down.

**The session mark does not survive a refresh, deliberately.** It exists so
the opening does not replay on every soft navigation back to the home page,
and it still does that. But frame 0 of this hero is a green field with a
small closed heart and NOTHING else — the eyebrow, the heading, both calls to
action and the bar are all revealed by scroll progress — so a visitor who
refreshed at the top of the page was stranded on an empty hero for the rest
of the session, which is the exact state the opening was added to prevent.
`playedThisSession` discards the mark when Navigation Timing says `reload`.
That is safe because the mark is not the guard that matters: `shouldAutoOpen`
still requires the visitor to be at the top, so a refresh anywhere else —
scroll restored mid-runway, heart already open — declines on the scroll test
and nobody reading has the page moved under them. Measured on a production
build (a dev server is useless for this: Vite's HMR reloads the page, so
every load reports `reload`): first arrival plays, refresh-at-top plays,
refresh-mid-page leaves the scroll at 1400, back-to-home does not replay.

Frame 0 is still reachable two other ways, both known: a same-session back
navigation to the home page that lands at the top (bfcache normally restores
the open hero instead, so this needs a real document reload), and a visitor
without JavaScript, for whom `progress` never advances and the copy stays at
`opacity: 0` — it is in the DOM, so crawlers and screen readers get it, but
it is invisible and no amount of scrolling reveals it. The `<noscript><style>`
in app.html that reveals the nav's entry list is the mechanism if that is
ever worth closing.

## Without scripts, both runway stages render their final frame

`HeartHero` and `PageMasthead` are 260vh runways whose opening is driven by
scroll progress that only JavaScript computes. Without it they rendered frame
0 — the photograph in its closed shape and the page's only `<h1>` at
`opacity: 0`, on `/`, `/es` and `/about` alike, which is every published page
with a masthead. The text is in the markup, so a crawler and a screen reader
were fine; it was a sighted visitor who got a green field and two and a half
screens of nothing. HeartHero at least had `.reveal:focus-within`, since its
block holds the two call-to-action links; PageMasthead's holds only a
paragraph and a heading, so on Who We Are nothing could reveal it at all.
**Reduced motion does not rescue this** — both `@media` blocks set only
`transition: none`, and the open frame comes from the `reducedMotion` STATE
variable, which is JavaScript.

The second `<noscript><style>` in `src/app.html` is the fix: the components'
own reduced-motion geometry plus the open values their JavaScript half
supplies. Three things about it are load-bearing:

- **Classes are TRIPLED, not doubled.** Svelte scopes a component rule with a
  hash class, so `.reveal` is really `.reveal.svelte-1abc` at (0,2,0), and
  those sheets arrive with the app's head markup BELOW this block — two
  classes tie and lose on order. (The nav list above it doubles, because it
  beats a (0,1,0) rule in app.css. Same lever, one class apart.)
- **The open heart is sized without measuring anything.** The component sets
  the mask as a percentage of the stage's WIDTH, which it can only learn from
  a ResizeObserver; `mask-size: auto 273.4919%` expresses the same heart as a
  multiple of its HEIGHT, because a percentage in that slot resolves against
  the positioning area's height. Algebraically identical to `heartEndPct` at
  every aspect, except the `Math.max` floor, which binds only above W/H
  1.6747 and gives a slightly smaller — still covering — heart there.
  `app-html.test.ts` holds the number against `HEART_END_HEIGHT_RATIO`.
- **`--opened: 1` is set on `.masthead-window`, the element that READS it**,
  not on the stage that declares it inline. A value declared on the element
  always beats an inherited one, so that needs no specificity contest.

`max-width: 47.999rem` rather than the components' `width < 48rem`: Safari
learned range syntax only in 16.4 and drops a block it cannot parse, which
here would hand a phone the 1440/860 desktop band. And `100vh` precedes every
`100svh`, since an engine without small-viewport units drops the declaration
and would be left with no height at all.

**A dev server cannot show any of this** and neither could the suite: the
shared Playwright config forces `contextOptions.reducedMotion: "reduce"` on
every test, which collapses both runways through the components' own media
query — so a no-JS test that inherits it passes on a page with no fix.

**Since 2026-09-05 these are asserted in four rendering states, not one.**
`tests/smoke/rendering.spec.ts` holds every invariant that must hold whatever
the visitor's browser is doing — the heading is painted, the band is not a
260vh runway, the stats are not the count's zeros, one figure per stat, one bio
per card, both stages have a height, the heart covers the band — with NO
`test.use` of its own. `playwright.config.ts` runs it in four projects:
{desktop, phone} x {scripts + reduced motion, no scripts + full motion}. Each of
those assertions used to live in the single cell where its defect was found.
Deliberately not all four combinations of the axes: with scripts AND full motion
the hero shows frame 0 for two seconds by design, so "the heading is painted" is
false of that state on arrival.

What stays in `tests/smoke/pages.spec.ts` is the genuinely one-sided half — a
control that cannot function must be hidden, a card must grow around the bio it
is now the only home for — plus the route, console and head assertions.

Opacity is asserted on the `.reveal` ANCESTOR, because opacity does not inherit
as a computed value and the `<h1>`'s own is 1 while it is completely invisible.
Everything is polled, because with scripts the values are written by effects
after hydration and a single read is a race in one cell and fine in three.

All of it was verified by deleting each fix and watching the tests go red — and
that is not a formality. The first attempt at the no-JS heart assertion PASSED
with the fix deleted: `-webkit-mask-size` on the line above `mask-size` in
app.html still supplied the value, so the test was vacuous. Delete both.

### Three more things a script was supplying

Same pattern, same two places: the element renders normally and hidden
(`app.css`), and the FIRST `<noscript><style>` in app.html reveals it while
hiding whatever control cannot work. That block doubles its classes, because
it beats (0,1,0) rules in app.css; the runway block below it triples, because
it beats (0,2,0) component-scoped ones. The unit test only holds the runway
block to the triple bar.

- **`CountUp` showed the count's starting zeros.** The visible layer is a
  tween that begins at `startValue` and is run by `onMount`, so with no script
  the stats band read "0+", "0 people", "0%", "0 lives" — not unanimated but
  WRONG, and the `sr-only` sibling carried the truth all along, which is
  exactly why nothing in the suite could see it. The component now renders two
  candidates, `.countup-live` and `.countup-nojs`, BOTH `aria-hidden` so the
  swap never changes what is announced. `.countup-live` stays first: the tests
  address "the visible number" as the first `[aria-hidden]` element.
- **`PersonGrid`'s bios existed only inside a pop-up a click creates**, so
  without a script they were not hidden but absent — unreachable for a visitor
  and invisible to a crawler. Each card renders `.person-bio-nojs` as well,
  and `[data-bio-toggle]` (the overlay button, which would also swallow
  selection of the bio under it) and `.person-open-cue` (the + badge, which
  advertises a pop-up that cannot open) both go — and `.person-card` loses its
  `aspect-ratio`, because the leadership card's height comes from its column
  width over `overflow: hidden`, so content cannot grow it and a real bio was
  simply CUT OFF (measured: 166px of it). **Nothing on `/about` currently has
  a bio** — the four board members have none, and the three leadership cards
  open on `!board` alone — so the only rendered bio on the site is on
  `/dev/a11y-fixtures`, which is where the smoke suite measures both
  directions of the coupling: revealed without scripts, `display: none` with
  them. That pair is the only thing that catches a class name drifting out of
  step with app.css, which would show every visitor a bio twice without
  tripping axe, a type error or a console warning.
- **`PageMasthead`'s stage collapsed to zero** on a reduced-motion phone, the
  same shape as HeartHero's below. Nothing reads that box, so nothing rendered
  wrong; it is fixed so the next thing to measure it does not inherit the bug.

Still outstanding, and NOT fixed: without a script the nav never swaps to its
cream bar (the swap is measured from the DOM), so past the first section its
links sit dark-on-navy over whatever the page is showing.

### The reduced-motion phone heart did not cover

Separate bug, found the same afternoon. `.heart-hero-stage`'s `height: 100%`
resolves against the band, and under reduced motion on a phone the band has
only a `min-height` — indefinite, so it computed to `auto`, and since every
child is absolutely positioned the box collapsed to ZERO. Layout survived it
(the mask is positioned against the section, which is `relative`), but
measurement did not: `heartEndPct` read 0 and fell back to the comp's 187.2%,
which on 390x664 is a 702x612 heart in a 664-tall band — its cleft and its
point both on screen with green around them, the exact failure the height
ratio was introduced to end. `height: 100svh` under that media query fixes
it, and it must sit BELOW the general stage rule, not inside the band's own
phone block above it: a media query adds no specificity, so at an equal
(0,2,0) the later declaration simply takes it back. It did, for one build.
No existing test could reach it — the rule needs reduced motion AND width
< 768, and every other test runs at the config's 1280x720 — so
`the reduced-motion phone frame` in the smoke suite pins it at 390x664.
