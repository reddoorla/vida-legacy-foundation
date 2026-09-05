# Two locales, one route tree

Spanish ships at launch. English is the master locale at the bare paths;
Spanish is `/es` and `/es/<uid>`. This is how one set of loaders serves both,
and — the part that shipped wrong three times — where the words the CMS does not
write have to live. The rule is one line in `CLAUDE.md` under Traps.

## Two locales, one route tree

Spanish ships at launch. English is the master locale at the bare paths;
Spanish is `/es` and `/es/<uid>`. The prefix is the optional route param
`[[lang=lang]]` (matcher: `src/params/lang.ts`, only `es` — `/en` is
deliberately not a URL), so one set of loaders serves both and `params.lang`
picks the Prismic locale through `$lib/locale`. Prismic's ids (`en-us`,
`es-mx`) never reach a URL.

- **Prerender enumerates both locales** from `getAllByType("page", { lang:
"*" })` via `$lib/prerender-entries`. A locale whose document is not
  published is simply absent from `entries()`, so an unpublished translation
  never becomes a 404 that fails the build.
- **The language switch only renders where the target exists**: a Prismic
  page's published translation (`page.data.alternates`), or a route in
  `LOCALIZED_STATIC_ROUTES` (`/contact`). Anything else — a page with no
  translation yet, the dev pages — gets no switch, because the crawler would
  follow it into a 404. Do not "fix" a missing switch by pointing it at `/es`
  until the Spanish home is published.
- **Chrome per locale** lives in `site-config.json` under `locales.es` (nav and
  footer replaced wholesale, hrefs included); `loadSiteConfig(lang)` resolves
  it. The contact page carries its own two-language copy.
- **The words the chrome supplies itself** — the skip link, "Open menu",
  "Close menu", the menu dialog's name, the language group's name, a dialog's
  close button, "Read the bio for …", the landscape cover — are in
  `$lib/ui-copy` (`ui(lang)`), because nothing translates them: they are code,
  not content. Components take the page's `lang` and slices read
  `context.lang`, the same split the contact and donation forms use for their
  field labels. Two siblings hold the rest: `$lib/contact-copy` (the contact
  panel's words, shared with the route's ACTION so a server-side failure
  answers in the right language — `createIngestAction` freezes its messages at
  construction, so the route builds one action per locale), and
  `$lib/form-validation` (the field messages, because native constraint
  validation speaks the BROWSER's language and puts it in a bubble that is not
  in the accessibility tree). `novalidate` on those forms is set from an
  effect, never written in the markup: it must apply only where scripts can do
  the job instead, or a no-JS visitor loses the guard entirely. `Modal` takes a `closeLabel` so its caller decides. Anything
  new that a visitor can read and Prismic does not write belongs there, or
  the Spanish site announces it in English (it did, until round 4).
- **Head**: `<html lang>` is set per request in `hooks.server.ts` (app.html
  carries `%lang%`), `og:locale` comes from the loader, and `Seo` emits
  reciprocal `hreflang` links plus an English `x-default` only when a page has
  a translation.
- **Previews** pass the locale-aware `linkResolver`, so an es-mx preview lands
  on `/es/…`.
