# figma-compare — measuring the site against the comp

The review standard for this site is "match the Figma": at the comp's 1440
width, element positions, sizes and type within a few pixels. Eyeballing two
screenshots does not get there; these scripts compare numbers.

Nothing here is wired into CI. It is a session tool: run it before opening a
PR that touches layout or type, and read the report.

| script            | what it does                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pull-figma.mjs`  | Comp geometry (every node's box, fills, layout, sticky flag, text + resolved style) and 1x renders, from the REST API. |
| `extract-dom.mjs` | The rendered site the same way: every section, text run and image with its box and computed type, plus a screenshot.   |
| `compare.mjs`     | Matches text runs to comp text nodes by content and reports the deltas: size, weight, line-height, tracking, x, width. |
| `sidebyside.mjs`  | Comp crop beside site crop at one scale, for the eye.                                                                  |
| `sample.mjs`      | Pixel colours and inked-row positions in any PNG — measure a ground, a panel, or the pitch between lines.              |
| `ink.mjs`         | Where a label's ink sits inside its box, at 4x — the number behind "the text looks low".                               |

```sh
D=/tmp/compare
FIGMA_PAT=… FIGMA_FILE=… node scripts/figma-compare/pull-figma.mjs $D home=5249:1130 about=5312:1214 donate=5328:1611
pnpm build && pnpm preview --port 4173 &
BASE=http://localhost:4173 OUT=$D node scripts/figma-compare/extract-dom.mjs
node scripts/figma-compare/compare.mjs $D home
```

The Figma file key and token stay in the environment — this repo is public.
The frame ids above are the final "Section 4" mockups: Homepage, Who We Are -
Final, Donation. The pinned bands (`STICKY_SCROLLS`) and the trimmed text
boxes (a 12px label reports an 8px box: Figma trims to cap height) are the
two comp facts that were invisible in screenshots and drove the most fixes.
