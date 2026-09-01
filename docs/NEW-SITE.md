# Per-site checklist

Everything in this repo that still carries a template default. `/new-site`
automates most of it; this file is the checklist that survives without the
skill, and the thing to re-read when a site "looks like the starter".

Find what is still unset:

```bash
grep -rn "your-prismic-repo-name\|reddoor-wireframer\|<Site name>\|<Client>" \
  --exclude-dir=node_modules --exclude-dir=.svelte-kit --exclude-dir=build .
```

## Identity

| File                       | Change                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` → `name`    | The site slug. Fleet audits match sites to Airtable rows by this.                                                                              |
| `.github/workflows/ci.yml` | `netlify-site: "<slug>"` — drives the deploy-preview link CI comments on every PR.                                                             |
| `slicemachine.config.json` | `repositoryName` → the real Prismic repo. **See "Placeholder builds" below.**                                                                  |
| `src/lib/seo.ts`           | `SITE_NAME` (defaults to `"Reddoor"` — every `<title>` says so until you change it), `SITE_LOCALE`, `DEFAULT_DESCRIPTION`, `DEFAULT_OG_IMAGE`. |
| `src/app.html`             | `<html lang>` if the primary language is not English.                                                                                          |
| `static/favicon.png`       | The client's icon.                                                                                                                             |
| `README.md`                | `<Site name>` and `<Client>`.                                                                                                                  |

## Design

| File                           | Change                                                                                                                                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app.css` → `@theme`       | Brand palette and `--font-heading` / `--font-body`. The shipped values are a deliberately mismatched placeholder set, so a token you forgot to set is visible rather than silent.                                                         |
| `src/lib/site-config.json`     | Nav items and footer columns/socials. Ships empty (logo-only Nav, placeholder Footer). Swap the module for a Prismic `settings` loader behind the same exports if the client edits chrome.                                                |
| `svelte.config.js` → `kit.csp` | Add every third-party host the design needs. The baseline allows Prismic, Vimeo, Turnstile and Google Fonts only — a font kit, YouTube embed, donation platform or analytics tag is blocked until listed. Self-hosted fonts need nothing. |

## Deploy

Netlify environment variables (set on the site, not in the repo):

- `FORMS_INGEST_URL` = `https://reddoor-maintenance.netlify.app/api/forms/<slug>`
- `FORMS_INGEST_TOKEN` = the shared ingest token (same value as the dashboard's)
- `PUBLIC_TURNSTILE_SITE_KEY` (optional) — per-domain widget from dash.cloudflare.com

See [`.env.example`](../.env.example) for the annotated list.

Renovate needs nothing per-repo: it authenticates as the org-wide
`reddoor-renovate` GitHub App.

## Placeholder builds

`slicemachine.config.json`'s `your-prismic-repo-name` sentinel is load-bearing.
While it is in place, Prismic-backed routes 404 during prerender and the build
tolerates it, so a fresh clone is green before the CMS exists. Replacing it with
a real repository name re-arms loud-fail prerendering by design — after that, a
404 during prerender fails the build. The sentinel is read in four places
(`svelte.config.js`, `src/lib/prismicio.ts`, the route loaders, and
`tests/smoke/routes.ts`); change it in `slicemachine.config.json` only.

## Before pushing

```bash
pnpm verify
```

Runs exactly what CI runs, in CI's order. See [STARTER.md](STARTER.md#scripts).
