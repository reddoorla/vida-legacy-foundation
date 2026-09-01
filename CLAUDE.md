# CLAUDE.md

Session rules for AI agents working a Reddoor site repo. This file ships with
the template, so every site generated from it starts with these rules.

## Before you push

```bash
pnpm verify
```

That is exactly what CI runs, in CI's order (prettier → eslint → svelte-check →
build → axe audit → unit + smoke). Run it instead of guessing which subset
matters — a red CI on a site repo costs a round trip through review.

Formatting is enforced on `.svelte` files too: the plugin loads from
`.prettierrc`, not from a CLI flag. Don't reintroduce `--plugin` to the `lint`
script — with no config file, `prettier --check .` silently skips every
`.svelte` file, and that is exactly the hole the config closes.

## Concurrent sessions

Site repos generally get **one** agent session at a time — but central
fleet-maintenance sessions (reddoor-maintenance) also open PRs here, so:

- **Check for an existing fix before starting one.** Look for fresh `fix/*`
  branches and open or just-merged PRs addressing the same signal — a fleet
  session may already have been dispatched for it. A duplicate fix gets
  closed as superseded, never merged.
- **Re-verify after any pause.** After a session-limit pause, compaction, or
  long gap: `git log --oneline -3` and `git status` before committing, and
  re-confirm the PR head SHA before merging.
- **If sessions must run concurrently** (rare), each works in its own git
  worktree — never commit from a checkout another session may be using.
- **Check a PR's real changed-file list before merging.** Fleet branches can be
  stacked on another open PR and drag it onto main.

## Orientation

| Looking for                       | Go to                                                                       |
| --------------------------------- | --------------------------------------------------------------------------- |
| What this stack ships             | [docs/STARTER.md](docs/STARTER.md)                                          |
| What's still a template default   | [docs/NEW-SITE.md](docs/NEW-SITE.md)                                        |
| A11y conventions and the axe gate | [docs/accessibility.md](docs/accessibility.md)                              |
| CSP, headers, form anti-bot       | [docs/security.md](docs/security.md)                                        |
| Page rendering                    | `src/routes/[[preview=preview]]/[uid]/+page.server.ts` → `$lib/page-load`   |
| Prismic slices                    | `src/lib/slices/<Name>/` — `model.json`, `mocks.json`, `index.svelte`, test |
| Brand tokens                      | `src/app.css` `@theme` block                                                |

## Traps

- **`src/lib/slices/index.js` and `src/prismicio-types.d.ts` are generated** by
  Slice Machine. Regenerating overwrites curated `mocks.json` content with
  lorem — re-curate after any regen, and check Number fields didn't come back
  as strings.
- **The `your-prismic-repo-name` sentinel is load-bearing.** It keeps a
  clone's build green before the CMS exists. See docs/NEW-SITE.md.
- **`RepositoryNotFoundError` extends `NotFoundError`.** Catching `NotFoundError`
  to serve a 404 will silently swallow a misconfigured repository name.
- **Never hand-roll `scrollTo`** — use `$lib/utils/instantNavScroll`.
- **Never redraw an asset in CSS** when the real file is downloadable. Ship the
  file.

---

# Vida Legacy Foundation — site-specific

Everything below is VLF, not the template. **This repo is public** — client
contacts, Figma/Dropbox/Discord links and board notes deliberately live outside
it, in the operator's local notes, not here.

## Where the build actually stands

Bootstrapped 2026-09-01. CI green, branch protection on (every change to `main`
goes through a PR). What is NOT done, in the order it blocks things:

1. **Prismic `vida-legacy` is empty** — zero custom types, zero documents. The
   `your-prismic-repo-name` sentinel in `slicemachine.config.json` is therefore
   still in place _on purpose_.

   Swapping it before the CMS has content **fails the build**, loudly and by
   design (`svelte.config.js` `handleHttpError`), because `/` prerenders
   `at(my.page.uid, "home")`:

   ```
   Error: 500 /: 500 /   ← this is the expected failure, not a regression
   ```

   Order to unblock: push the `page` custom type from Slice Machine (there is
   no create-custom-type API — the Prismic MCP connector is read-only for
   types), publish a `home` document, _then_ swap the sentinel.

2. **Spanish locale is not added.** The repo has `en-us` only. VLF is bilingual
   and the translated copy is already here (see below), so add the locale
   before anyone authors content.
3. Netlify site + `FORMS_INGEST_URL` / `FORMS_INGEST_TOKEN` (docs/NEW-SITE.md).

## Brand colours — two of them cannot hold text

Measured against the cream ground `#fef5e9` (AA needs 4.5 for body, 3.0 large):

| token                        | hex       | ratio on cream | use         |
| ---------------------------- | --------- | -------------- | ----------- |
| `--color-green`              | `#9cbf5b` | **1.94**       | fill only   |
| `--color-coral`              | `#de7762` | **2.81**       | fill only   |
| `--color-secondary` (forest) | `#2c3b1a` | 10.4           | body text   |
| `--color-accent` (dark red)  | `#652323` | 9.6            | accent text |
| `--color-primary` (blue)     | `#065184` | 7.9            | text, links |

**White on the green CTA button is 2.10 — a straight AA failure**, and that
button is the primary "register to become an organ donor" action. If a green
button is required, night `#00263f` on green is 7.43 and forest is 5.73.

`pnpm test:a11y` gates this, so a regression fails CI rather than shipping —
but the gate only sees rendered routes. Do not assign `--color-green` or
`--color-coral` to text in a slice and assume review will catch it.

## Fonts — kit `alh8out`, and a weight that does not exist

Wired in `src/app.html`. **Not** the fleet's shared kit `noj4tji`: that one has
`pragmatica` but no `pragmatica-extended`, which `--font-heading` needs.

> **`pragmatica-extended` ships only weights 400 and 700. There is no Light
> (300).** The design spec is Pragmatica Extended _Light_, so headings currently
> render heavier than the comps. Fixing it is an Adobe Fonts kit change, not a
> code change.

Verifying a weight, if you touch this: `document.fonts.check('300 16px
"pragmatica-extended"')` returns **`true`** even though 300 does not exist — it
matches at family level after fallback. Iterate `[...document.fonts]` and read
each face's `.weight` / `.status` instead.

## Two CSP traps, both silent

1. **`p.typekit.net` belongs in `style-src`, not just `font-src`.** It serves a
   second stylesheet (`p.css`) as well as the woff2 files. With only `font-src`
   the browser blocks `p.css` and no face ever registers. The smoke suite's
   console-error assertion is the only thing that surfaces this — keep it.
2. **No inline event handlers.** The fleet's usual font trick —
   `media="print"` plus `onload="this.media='all'"` — is an inline handler, and
   this site's CSP grants `script-src` nonces _without_ `'unsafe-inline'`. A
   nonce never authorises an inline handler, so the swap is blocked, `media`
   stays `"print"`, and fonts are fetched but never applied with no error on the
   happy path. The plain `<link rel="stylesheet">` here is deliberate.

## Assets and copy already in the repo

| path                             | what                                                           |
| -------------------------------- | -------------------------------------------------------------- |
| `static/logo-mark.svg`           | the mark alone (blue swoosh, green swoosh, heart)              |
| `static/logo-lockup.svg`         | full horizontal lockup, mark + wordmark                        |
| `static/favicon.png`             | the mark at 94% on cream, 512²                                 |
| `content/es-website-content.txt` | Spanish site copy, 171 paragraphs, keyed to the Figma sections |

The Spanish source is labelled _Español latino (EE. UU.)_ — that is the locale
to add in Prismic.

The logo came out of Figma via `download_assets`, which returns the lockup plus
separable sub-assets; the mark is the 2:1 one. The Dropbox logo-package share
link is **not** usable programmatically — it renders its file listing
client-side, so there is nothing to fetch server-side.

The favicon's ceiling, so nobody re-litigates it: the mark is 2:1, so it can
never fill more than half a square tile's height. 94% inset was chosen over 84%
(too small at 32px); a cream tile was chosen over transparent, which nearly
disappears on a dark tab bar. 16px stays marginal regardless of inset.

## Still template defaults

`DEFAULT_OG_IMAGE` is intentionally unset — shipping the starter's card would
leak Reddoor branding onto a client site. Needs a 1200×630 `og-default.png`.
`src/lib/site-config.json` still ships empty (logo-only Nav, placeholder
Footer).
