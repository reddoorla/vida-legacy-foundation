# Forms — the contact modal and the donation form

Two forms, one vocabulary (`.vlf-label` / `.vlf-field` / `.vlf-pill` in
`app.css`), and a deliberate split between what the author owns (copy) and what
the code owns (field labels, because they change with the payload). The
donation form ships hidden and has no backend; what wiring one would take is
measured under "Where the build actually stands" in `CLAUDE.md`.

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
