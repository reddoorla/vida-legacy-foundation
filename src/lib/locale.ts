/** The site's two locales and the URL scheme that carries them.
 *
 *  English is the master locale and lives at the bare paths ("/", "/about");
 *  Spanish is prefixed ("/es", "/es/about"). The prefix is a SvelteKit
 *  optional route parameter (`[[lang=lang]]`, matched by src/params/lang.ts),
 *  so one set of loaders serves both locales and `params.lang` decides which
 *  Prismic locale to query. Prismic's own ids (`en-us`, `es-mx`) never reach
 *  a URL: `es-mx` was the nearest thing Prismic's picker offered for the
 *  client's "Español latino (EE. UU.)" copy, and it is baked into the CMS. */
export type Lang = "en" | "es";

export const DEFAULT_LANG: Lang = "en";

export const LOCALES = {
  en: { prismic: "en-us", prefix: "", html: "en", og: "en_US", label: "English", short: "EN" },
  es: { prismic: "es-mx", prefix: "/es", html: "es", og: "es_MX", label: "Español", short: "ES" },
} as const satisfies Record<
  Lang,
  { prismic: string; prefix: string; html: string; og: string; label: string; short: string }
>;

export const LANGS = Object.keys(LOCALES) as Lang[];

/** True for a URL segment that selects a non-default locale ("es"). The
 *  default locale has no prefix, so "en" is deliberately NOT a prefix — "/en"
 *  would be a second URL for the same English page. */
export function isLangPrefix(segment: string | null | undefined): segment is Exclude<Lang, "en"> {
  return LANGS.some((l) => l !== DEFAULT_LANG && LOCALES[l].prefix === `/${segment}`);
}

/** The locale for a `[[lang]]` route param — absent means the default. */
export function langFromParam(param: string | null | undefined): Lang {
  return isLangPrefix(param) ? param : DEFAULT_LANG;
}

/** The locale for a Prismic document `lang` ("en-us" → en); undefined for a
 *  locale the site does not serve, so callers can skip such documents rather
 *  than mis-file them under English. */
export function langFromPrismic(prismicLang: string | null | undefined): Lang | undefined {
  return LANGS.find((l) => LOCALES[l].prismic === prismicLang);
}

export function otherLang(lang: Lang): Lang {
  return lang === "en" ? "es" : "en";
}

/** Prefix a root-relative path for a locale. Anything that is not a
 *  root-relative path (an external URL, `tel:`, a hash, "") passes through. */
export function localizePath(path: string, lang: Lang): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const prefix = LOCALES[lang].prefix;
  if (!prefix) return path;
  return path === "/" ? prefix : prefix + path;
}

/** Remove a locale prefix, if any: "/es/about" → "/about", "/es" → "/". */
export function stripLangPrefix(pathname: string): string {
  for (const l of LANGS) {
    const prefix = LOCALES[l].prefix;
    if (prefix && (pathname === prefix || pathname.startsWith(prefix + "/"))) {
      return pathname.slice(prefix.length) || "/";
    }
  }
  return pathname;
}

/** The URL of a `page` document: "home" is the locale root. */
export function pathForDoc(uid: string, lang: Lang): string {
  return localizePath(uid === "home" ? "/" : `/${uid}`, lang);
}

export type Alternate = { lang: Lang; href: string };

/** Routes that exist in every locale without a Prismic document behind them.
 *  The language switch may point at these blindly; anything else needs a
 *  translation to point at, or the prerender crawler follows the switch into
 *  a 404 and fails the build (loud-fail is deliberate — see CLAUDE.md). */
export const LOCALIZED_STATIC_ROUTES = ["/contact"];

export type SwitchTarget = { lang: Lang; href: string; label: string; short: string };

/** Where the language switch should send the visitor, or undefined when the
 *  current page has nothing to switch to — a Prismic page with no published
 *  translation, or a route that only exists in one locale (the dev pages).
 *  A Prismic page passes its `alternates` (itself plus its translations);
 *  a static route passes none and is matched against LOCALIZED_STATIC_ROUTES. */
export function switchTarget(
  current: Lang,
  alternates: readonly Alternate[] | undefined,
  pathname: string,
): SwitchTarget | undefined {
  const target = otherLang(current);
  let href: string | undefined;
  if (alternates) {
    href = alternates.find((a) => a.lang === target)?.href;
  } else {
    const bare = stripLangPrefix(pathname);
    if (LOCALIZED_STATIC_ROUTES.includes(bare)) href = localizePath(bare, target);
  }
  if (!href) return undefined;
  return { lang: target, href, label: LOCALES[target].label, short: LOCALES[target].short };
}
