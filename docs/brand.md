# Brand — colours, type and the shipped assets

Everything here was measured, not read off the brand sheet, and the numbers are
the point: where the PDF and the Figma variables disagreed, the PDF was wrong by
one value per channel and it showed as a seam. The rules a session must not
violate are one line each in `CLAUDE.md` under Traps; this is the evidence
behind them. History of how each was arrived at is in
[workJournal.md](./workJournal.md).

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
