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
