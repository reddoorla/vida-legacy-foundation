# The 42-pixel line: what Figma's text boxes measure, and why your comp will never match

_Vida Legacy Foundation, September 2026. Every number here was pulled from the
design file's REST API on the day of writing; the script that pulled them is
`scripts/figma-compare/pull-figma.mjs` in this repository._

We built a three-page site to a Figma comp, with the review standard "match it
within a few pixels at 1440." The first pass was called done by eye. The
measured pass then re-did three finished pages and spent nine pull requests on
one scrolling mechanism, and most of that rework traced to a single fact about
the design file that is invisible in every screenshot of it and absent from the
Figma MCP server's output shape.

**Figma can trim a text box to the cap height and the baseline.** When it does,
the box the design tool reports — and the box every gap in the comp is measured
from — is not the line-height. It is roughly 70% of the font size.

## The measurement

`GET /v1/files/:key/nodes` returns each `TEXT` node with a `style` object and an
`absoluteBoundingBox`. Here are single-line nodes from the donation page and the
homepage, one per distinct style:

| family              | weight | size | line-height | **box height** | box ÷ size | `leadingTrim` |
| ------------------- | -----: | ---: | ----------: | -------------: | ---------: | ------------- |
| Pragmatica Extended |    300 |   60 |          81 |         **42** |      0.700 | `CAP_HEIGHT`  |
| Pragmatica Extended |    300 |   36 |          42 |         **25** |      0.694 | `CAP_HEIGHT`  |
| Pragmatica Extended |    400 |   18 |        26.1 |         **13** |      0.722 | `CAP_HEIGHT`  |
| Pragmatica Extended |    400 |   12 |        17.4 |          **8** |      0.667 | `CAP_HEIGHT`  |
| Pragmatica Extended |    400 |   10 |          15 |             15 |      1.500 | —             |
| Pragmatica          |    300 |   16 |          24 |             24 |      1.500 | —             |
| Area Normal         |    700 |   10 |          15 |             15 |      1.500 | —             |

Read the first row. A 60px display line with an 81px line-height reports a
**42px** box. The last three rows are the untrimmed case: box equals
line-height, exactly as CSS would lay it out.

Two things follow that a screenshot cannot tell you.

**Every vertical gap in the comp is cap-to-baseline, not box-to-box.** The
designer put 30px between a heading and the paragraph under it. In the file,
that 30px runs from the heading's baseline to the paragraph's cap line. Render
the same text in a browser with the same font, size and line-height, put 30px
of margin between the two boxes, and the visible gap is 30px plus the heading's
descender space plus the paragraph's half-leading — on the 60/81 display style
that is about 20 extra pixels, and on a 12/17.4 label about 5. Nothing lines
up, every measurement is "a bit low", and the natural fix — nudging margins
until it looks right — produces numbers that are wrong at every other font
size.

**It is per style, not per family.** The fifth row is Pragmatica Extended too:
the 10px form-field label, untrimmed, box = 15 = line-height. The trim is a
property of the text style the designer applied, and the API names it:
`style.leadingTrim` is `"CAP_HEIGHT"` on the trimmed nodes and absent on the
rest. Our own documentation said "Figma trims its Pragmatica Extended text
boxes" for four days before this table corrected it.

Across the four trimmed sizes the ratio is 0.667–0.722, which is Pragmatica
Extended's cap height (≈0.70em) rounded to whole-pixel boxes at each size. It
will be a different constant for a different face, and the API gives you the
box directly, so there is no need to know it.

## Why the tools do not show it

The Figma MCP server's `get_design_context` returns generated code and a
screenshot; `get_screenshot` returns pixels. Neither exposes `leadingTrim`, and
in a rendered image a trimmed and an untrimmed box paint identically — the trim
changes the geometry the designer measured from, not the glyphs. So an agent or
a developer working from the MCP output has no way to learn that the 30px they
were given is not the 30px they should write.

The REST API exposes it, alongside `absoluteBoundingBox`, `lineHeightPx`,
`letterSpacing` and — separately useful — `scrollBehavior: "STICKY_SCROLLS"` on
frames the prototype pins. That is the reason our comparison harness reads the
REST API for geometry and uses the MCP only for the visual.

The commercial and open-source Figma-to-implementation comparison tools we
looked at are pixel-diff tools with a style overlay. Run against this site,
one of them reported a single typography difference on the page's `<h1>`: the
`font-family` string `pragmatica-extended` (Adobe Fonts' slug) versus
`Pragmatica Extended` (Figma's display name) — a false positive — and no size,
line-height, tracking or position delta at all. A pixel diff shows you that the
heading is 20px low. It cannot tell you it is 20px low because the box it was
measured against was trimmed.

## The fix, in CSS

The CSS Inline Layout Module has exactly this control, and it reached all three
engines this summer:

```css
text-box: trim-both cap alphabetic;
```

`text-box-trim: trim-both` removes the space above and below the line box;
`text-box-edge: cap alphabetic` says which metrics to trim to — the cap height
above, the alphabetic baseline below. The result is a box that measures what
Figma's does, so the comp's gaps can be written down as margins verbatim.

Support: Chrome and Edge from 133, Safari from 18.2, Firefox from 154
(18 August 2026). It is Baseline newly-available as of late August 2026. In an
engine without it the declaration is ignored, the box falls back to the line
box, and the page is a few pixels looser with the same type — a degradation
nobody will report.

What we actually ship is one utility per Figma text style, so a component takes
the style by name instead of re-deriving it, and the trim travels with the
style rather than with the element:

```css
/* Pragmatica Extended Light 60/81 — the page statements and menu entries. */
@utility t-display {
  font-family: var(--font-heading);
  font-weight: 300;
  font-size: clamp(2rem, 4.17vw, 3.75rem);
  line-height: 1.35;
  letter-spacing: 0;
  text-box: trim-both cap alphabetic;
}
```

Six of the seven `t-*` utilities carry the trim. `t-body` does not, because the
comp's body copy is not trimmed (row six above), and neither are the button
labels. The comment above the block in `src/app.css` records the rule so the
next person does not "fix" the untrimmed ones for consistency.

## The rule, for the next comp

1. **Pull the geometry from the REST API on day one**, before the first
   component. Record `style.leadingTrim` on every text node alongside the box.
   Our harness did not for its first week — it saw a 42px box on a 60px line
   and could not say why — and it does now.
2. **Group the text nodes by style and check the ratio.** Box ÷ size near 0.7
   with `leadingTrim: "CAP_HEIGHT"` means every gap from that node is
   cap-to-baseline. Box = line-height means it is not. Expect both in one file.
3. **Encode each trimmed style once**, with `text-box: trim-both cap alphabetic`
   in the style's own class, and write the comp's gaps as margins without
   adjustment.
4. **Measure the render the same way** — element boxes and computed type from
   the DOM, matched to the comp's text nodes by content — and read the deltas.
   "Looks right" was what called the first pass done.

The whole thing is one API field and one CSS declaration. What it cost us was
finding out that the field existed after the pages were built.
