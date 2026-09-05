# Process review — the retrospective, checked against the field

`docs/workJournal.md` ends with ten recommendations drawn from four days of
building this site. They were written from the inside, from our own defects,
with no reference to how anyone else solves the same problems. This document is
the outside check: eight research agents across four angles, their claims
verified against this repo rather than taken on report, and then the three
highest-value recommendations actually implemented so the review has evidence
rather than intentions.

Written 2026-09-05, the same day the ten changes shipped. It corrects the
retrospective in two places and says so.

---

## The finding that matters most came from the checker itself

One agent was asked how the field stops coding agents from making confident
false claims. Its report told me that this repo's `CLAUDE.md` still carried a
stale paragraph about the axe gate scanning only `/dev/a11y-fixtures`, and
recommended correcting it.

It doesn't. `pkg.reddoor.a11yRoutes` landed in #55 and that paragraph is gone.
The agent had reasoned from the retrospective text in its own prompt — which
describes the pre-fix state as history — and **never opened the file**.

That is the entire failure mode in one artifact: a report about hallucinated
completion claims, containing one, produced by an agent that had been told our
number-one failure mode was exactly that. It is also the cheapest possible
lesson, because the check takes one `grep`.

**The rule that follows:** a claim about a file is not reportable until the file
has been opened in the same session that reports it. Not "the repo does X" from
memory, from a prompt, or from a summary — from the file. Every measured number
below was re-derived here before being written down, and one of them changed as
a result.

---

## The parity harness is a commodity, and I led with it

I briefed the research on `scripts/figma-compare/` as our most distinctive
asset. Three of four checkers said that is the wrong flag to plant, and they are
right.

- **uiMatch** (open source) does Playwright + Figma REST comparison with a
  Design Fidelity Score, ΔE2000 colour distance, and CI exit codes — four things
  ours lacks.
- **Fidel** sells this exact architecture as a $29 GitHub Action.
- **Uiprobe** went free in April 2026 with a Chrome extension.
- Figma has acquired the leading open-source visual-diff team, which makes this
  a category the platform vendor is walking into.

Ours is **542 lines across six scripts**, of which the comparator is **121**. It
prints deltas, matched by normalised text content. No score, no threshold, no
exit code, no per-commit record.

**One piece of it is genuinely novel and worth writing up publicly:** Figma
trims Pragmatica Extended text boxes to cap height and baseline, so a 12px label
reports an 8px box and a 60px line a 42px one. That is invisible in a
screenshot, fatal to naive geometry comparison, and no tool in the field
documents it. The `t-*` utilities in `app.css` are the encoding of it.

**Consequence for recommendation #1.** _Build the comp-measuring harness at
Stage A, before the first slice_ — that stands, and the evidence for it (three
PRs re-doing finished pages, nine on a mechanism it would have specified once)
is unaffected. What does not follow is _build it yourself_. Evaluate uiMatch on
the next comp before extending ours, and keep the cap-height handling either
way, because nothing off the shelf has it.

---

## What we are actually ahead on got one sentence

The research filed it under "secondary": a per-repo **corrected trap corpus** —
prose that records disproven beliefs by name —

> An earlier version of this file claimed white-on-green _was_ the design's
> primary "register to become an organ donor" button. That was wrong. The comps
> never specified it.

— plus an **append-only journal** where a later entry names the one it
overturns, both read by an agent before it acts. The closest widely-used
equivalent, Cline's Memory Bank, rewrites `activeContext.md` every session and
would have compacted that paragraph away the first time it stopped being the
active context.

That is the differentiator, and I under-weighted it in the brief. It is also
what the ten recommendations are made of: every one of them is a paragraph of
this repo's journal, generalised.

---

## Four mechanisms installed and unused — measured, not estimated

Across all 39 repositories on this machine:

| mechanism                                      | count |
| ---------------------------------------------- | ----: |
| `.claude/agents` directories                   |     0 |
| operator-authored hooks                        |     0 |
| repos with mutation tooling                    |     0 |
| the verification-before-completion skill, used |     0 |

The only hook on the machine belongs to a plugin. Recommendation #3 — _a pass
must require positive evidence_ — and #6 — _break the thing on purpose_ —
together describe **mutation testing**, which has had mature JavaScript tooling
for over a decade, and which this repo was performing by hand, one defect at a
time, at a cost of roughly a week.

That count is now 1. See below.

---

## The measured liability is the artifact I spent the day enlarging

This repo's `CLAUDE.md` is **963 lines, 9,454 words, 59,433 bytes** — roughly
13K tokens loaded into every session regardless of task.

The only measured study of this artifact class is Gloaguen et al., ETH Zurich,
[arXiv:2602.11988](https://arxiv.org/abs/2602.11988) (February 2026): 138 tasks,
four agents. Developer-written context files bought **+4% task success for +19%
inference cost**, and the paper concludes that _unnecessary requirements from
context files make tasks harder_.

So the archive is an asset and keeping all of it in the always-on file is not.
The split to make — traps and history into the journal, only the minimum a
session must not violate left in `CLAUDE.md` — cuts directly against what I did
today, which was add to that file across 39 repositories. The convention rollout
was still right; the size of this particular file is a separate problem and it
is now the largest one on this list.

Honest accounting, since this is the section where it matters: writing this
document added another 42 lines to `CLAUDE.md` — two Orientation rows and the
paragraphs recording the new gates, which a session genuinely needs to find. It
is **1,005 lines** as of this commit, not 963. Every one of those additions was
defensible on its own and the total is the problem, which is exactly how a file
gets to 963 in the first place.

---

## One claim I withdrew

The starter PR said journal entries are anchored to "a PR under branch
protection and a green `pnpm verify`." A checker killed it, correctly.

This very retrospective established that a `pnpm verify` pass was granted on the
absence of an error string, and that the axe gate audited no real page of the
site for four days while every PR reported "0 violations". **An anchor to a gate
that demonstrably lied is the appearance of provenance, which is worse than
none.** The claim is not in the merged text.

---

## What the follow-through found

The three highest-value items were implemented rather than recommended. Each
turned up something the review could not have asserted otherwise.

### Mutation testing (#61)

`pnpm test:mutate`, once, outside CI. **81.21%** overall — a healthy headline,
and irrelevant next to where the survivors sat. Full findings in
[`mutation-audit.md`](./mutation-audit.md); the three that justify the exercise:

- **`src/lib/turnstile.ts` scored 40 with no unit test at all.** The module at
  the centre of the entire positive-evidence lesson — the one whose
  misconfiguration buckets every real lead as spam — was the lowest-scoring file
  in the repo. Its whole `onerror` handler could be emptied silently.
- **`/health`'s `prerender = false` could be flipped to `true`** with nothing
  red, freezing the endpoint the fleet polls for liveness into a build-time
  snapshot reporting `ok: true` forever.
- **A code comment claimed a behaviour no test checked** — `/health`'s `.trim()`
  on the sitekey, documented as making a whitespace value "report dark here
  too". Dropping it survived. That is recommendation #6 catching itself.

Six files went from ~50% combined to 94.44%. Three issues (#58–#60) hold the
rest, including 107 survivors across the four `use:` actions — all of them in
teardown rather than geometry, which is a leak on every navigation that no gate
here can see.

### The rendering matrix (#62)

Eleven invariants × four cells; the smoke suite went from 22 tests to 67. The
important result is not the number.

**The first break-test passed.** Removing `mask-size: auto 273.4919%` from
`app.html` left the no-JS heart assertion green, because the
`-webkit-mask-size` line above it still supplied the value. The test was
vacuous, written and about to be committed by the same session that had just
finished writing "break the thing on purpose" into three repositories.

That is the strongest single datum in this document. The rule is not aspiration
and it is not automatic: it caught its own author within the hour.

Removing both declarations reds `no-js` and `phone-no-js` and leaves the
scripts-on cell green, which is correct. Two further break-tests behaved as
designed — `height: 100svh` → `100%` reds `phone` alone, and breaking the
`.reveal` hatch reds six of twelve.

**Aria snapshots over pixel baselines.** `toMatchAriaSnapshot` is free, in the
tree rather than in the rasteriser, and therefore identical on macOS and CI's
Linux — where a screenshot baseline needs a container or a tolerance and turns a
regression check into a chore. It is also text, so it reviews in a PR. Verified
against the bug class that actually shipped here: swapping
`openMenu: "Abrir el menú"` for `"Open menu"` reds `/es` with a one-line diff.
English reached Spanish readers three separate times on this build, each round
found by eye.

It would not have caught the head-in-`<body>` bug — `<meta>` and `<link>` are
not in the accessibility tree — and that is worth saying plainly, because the
temptation is to claim a new gate covers the last defect that hurt.

### Forward pointers (fleet-wide, starter#116)

The journal rule says a superseded entry is never rewritten; a later entry
corrects it and names which one. That is right and it is **half a mechanism**:
the correction lands at the bottom of the file, and a reader searching for
"sticky band" arrives in the middle, on the superseded paragraph, with nothing
pointing forward.

Evidence it was needed turned up by accident. Sweeping the convention across the
fleet found `a-budget`'s `CLAUDE.md` already doing it by hand, uncommitted:

> **SUPERSEDED WHILE IN DEBT PAYOFF — see "Envelopes: pure retroactive" below.**

Somebody hit the problem and invented the fix locally, which usually means a
convention is missing rather than a person is wrong.

### And one new finding

**Both browser gates run against `vite dev`.** `configs/playwright-a11y` and the
a11y audit's synthesized config both start the system under test with
`npm run vite:dev`. So recommendation #10 — _verify on a production build_ — is
not merely unimplemented, it is contradicted by the harness that enforces the
other nine, and all 67 assertions in the new matrix inherit the problem. Filed
as reddoor-maintenance#700. Observed live during a run today: the dev server
fires a `connect-src` CSP violation for the Typekit stylesheet that production
does not, which is issue #6 — open since day one and uncloseable by a gate that
runs in dev.

---

## Revised order

1. **Move the gates onto a production build** (maint#700). It is now the ceiling
   on everything else: the matrix, the aria snapshots and the axe audit all
   measure a server no visitor will ever use.
2. **Split `CLAUDE.md`** before adding another line to it. Traps and history to
   the journal; only the minimum a session must not violate stays always-on.
   Measured cost of not doing it: +19% on every session.
3. **Clear the mutation backlog** (#58–#60), starting with the four actions'
   teardown.
4. **Evaluate uiMatch before extending `figma-compare`**, and keep the
   cap-height trim regardless. Do not promote the harness to a fleet CI gate: it
   measures one viewport, text only, against an unversioned file a designer can
   move, and most of what cost four days lived at widths the comp never drew.
5. **Write up the cap-height trim publicly.** It is the one thing here the field
   does not already have.
