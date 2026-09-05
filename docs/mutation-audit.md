# Mutation audit — which gates are theater

`pnpm test:mutate` runs [Stryker](https://stryker-mutator.io) over the site's
TypeScript: it makes a small change to the source (flip a `<=` to `<`, blank a
string, delete a call, empty a block), runs the unit suite, and records whether
anything went red. A mutant that **survives** is a change to shipped behaviour
that the suite cannot see.

It is deliberately **not** in `pnpm verify` and not in CI. The full run takes
nine minutes and its output is a reading list, not a pass/fail. Run it when you
want to know whether a suite means what it claims — before trusting a coverage
number, after adding tests to a module you care about, or when a defect got
through a green build.

```sh
pnpm test:mutate                                   # everything, ~9 min
npx stryker run --mutate 'src/lib/turnstile.ts'    # one file, seconds
```

Scope is set in `stryker.config.json`: `src/lib`, `src/params`, and the
`+server.ts` route handlers. Svelte components are excluded — Stryker does not
parse `.svelte`, and the component behaviour that matters here is asserted in
Playwright rather than in jsdom anyway.

## Why this exists

The work journal's recommendation #3, written 2026-09-05, says a pass must
require positive evidence and never the absence of an error, and #6 says to
write the test that fails for the reason you think it fails **by breaking the
thing on purpose**. Both were arrived at by hand, over four days, one defect at
a time. Mutation testing is the mechanical form of exactly that, and it has
been a solved problem since 2010. Running it once was cheaper than the week
that produced the rule.

## First run — 2026-09-05

**81.21% overall.** 1,219 mutants over 35 files: 989 killed, 191 survived, 38
never reached by any test, 1 timeout, 0 errors. As a headline that is a healthy
number. The value is entirely in where the survivors clustered.

The audit found one module below 50%, two files with no coverage at all, and —
the finding that justified the exercise — **the survivors were concentrated in
precisely the code the repo's own documentation calls load-bearing.**

### What was fixed in the same PR

| file                                | before | after      | what survived                                                                  |
| ----------------------------------- | -----: | ---------- | ------------------------------------------------------------------------------ |
| `src/lib/turnstile.ts`              |  40.00 | **100.00** | no test existed at all                                                         |
| `src/params/lang.ts`                |   0.00 | **100.00** | no coverage — the matcher that decides whether `/es` is a route                |
| `src/params/preview.ts`             |   0.00 | **100.00** | no coverage                                                                    |
| `src/lib/prismicio.ts`              |  55.56 | **94.44**  | the `your-prismic-repo-name` sentinel, `===` → `!==` and the literal blanked   |
| `src/routes/health/+server.ts`      |  70.59 | **94.12**  | `prerender = false` → `true`; the 5s timeout arm; the `!!` coercion; `.trim()` |
| `src/routes/sitemap.xml/+server.ts` |  60.00 | **88.00**  | `prerender = true` → `false`; the `Content-Type`; `lang: "*"`                  |

Combined, those six went from roughly 50% to **94.44%**, with no uncovered
mutants left. Four of them deserve naming.

**`turnstile.ts` had no unit test.** The module at the centre of the entire
positive-evidence lesson — the one whose misconfiguration buckets every real
lead as spam — was the lowest-scoring file in the repo. Surviving mutants
included `script.async = false`, `script.defer = false`, the
`if (window.turnstile) resolve(...)` guard forced true **and** false, the
`resolve()` call deleted outright, and the whole `onerror` handler emptied.
That last one is two failures at once: the dead `<script>` accumulates in
`<head>` and the cached promise is never cleared, so after one network blip the
widget can never recover for the life of the page — and nothing was watching.

**`/health` could be prerendered and nothing would fail.** `export const
prerender = false` flipped to `true` survived. The fleet polls that endpoint for
liveness; prerendered, it would report the state of the CI machine at build
time, forever, with `ok: true`. The sitemap has the same shape in the other
direction (`prerender = true` → `false` survived), where the cost is a Netlify
function invoked on every crawl instead of a static file.

**A comment claimed something no test checked.** `/health`'s `turnstile` field
is `!!publicEnv.PUBLIC_TURNSTILE_SITE_KEY?.trim()`, and the comment beside it
says the trim exists so "a stray-whitespace value reports dark here too, not
falsely present." Dropping `.trim()` survived: every fixture used a well-formed
key. That is journal recommendation #6 in miniature — a coverage claim written
in the same session as the code, never verified against it.

**The sitemap asked Prismic for one locale and nothing noticed.** Blanking
`lang: "*"` survived, because the mocked client ignores its arguments and the
test only read the rendered XML. The Spanish half of the site would vanish from
the sitemap with the suite fully green.

### Still open, filed rather than fixed

Per journal recommendation #5 — found and not fixed in the same PR means an
issue, not a note.

| area                                                  | survivors | issue |
| ----------------------------------------------------- | --------: | ----- |
| The four `use:` actions' lifecycle + teardown         |       107 | #58   |
| `src/routes/api/preview`, `api/csp-report`            |        11 | #59   |
| `heart.ts`, `seo.ts`, `form-validation.ts` boundaries |        35 | #60   |

The pattern in the actions is worth stating, because it is not a gap in rigour:
`stickyCover.ts` scored 69% with **63 survivors**, and its pure geometry —
`coverRun`, `stickyTop`, the fractional stacking — is well killed. The survivors
are almost entirely the DOM-wiring half: `removeEventListener`, `disconnect()`,
`removeAttribute`, `removeProperty`, the whole `destroy()` return. The tests
assert the mathematics that took nine PRs to get right and say nothing about
whether the observers are ever torn down. That is a leak on every navigation,
and it is invisible to every gate the repo has.

## Reading the output

`reports/mutation/mutation.html` (gitignored) is the interactive report — source
with each mutant inline. The JSON beside it is easier to slice:

```sh
node -e '
  const d = require("./reports/mutation/mutation.json");
  for (const [f, v] of Object.entries(d.files))
    for (const m of v.mutants)
      if (m.status === "Survived" || m.status === "NoCoverage")
        console.log(f, m.location.start.line, m.mutatorName, "->", m.replacement);
'
```

Two cautions learned on the first run.

**Not every survivor is a bug.** A mutant that changes a log message, a
whitespace separator inside a well-formed document, or an argument to a mock
that legitimately ignores it is noise. Six survivors remain in the six files
above and all six are that. Judge each one by asking what a user would
experience, not by chasing the number.

**A mocked seam hides argument mutants.** Where a test mocks a client and reads
only the output, every mutant inside the call's arguments survives by
construction. The fix is to assert the call — `toHaveBeenCalledWith` — which is
worth doing exactly when the argument carries meaning, as `lang: "*"` does.
