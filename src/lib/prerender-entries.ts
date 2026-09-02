import { DEFAULT_LANG, LANGS, LOCALES, langFromPrismic } from "$lib/locale";

/** The subset of a Prismic page document the prerender entry lists need. */
export type EntryDoc = { uid: string | null; lang: string };

/** entries() for the home route: one entry per locale that has a published
 *  `home`. The default locale is `{}` (no `lang` param → "/"), others carry
 *  their prefix param → "/es". A locale with no home is simply absent, so an
 *  unpublished translation never becomes a 404 that fails the build. */
export function homeEntries(pages: readonly EntryDoc[]): { lang?: string }[] {
  return LANGS.filter((l) =>
    pages.some((p) => p.uid === "home" && p.lang === LOCALES[l].prismic),
  ).map((l) => (l === DEFAULT_LANG ? {} : { lang: l }));
}

/** entries() for the [uid] route: every published page document, in its own
 *  locale, except home (which renders at the locale root). Documents in a
 *  locale the site does not serve are skipped. */
export function pageEntries(pages: readonly EntryDoc[]): { lang?: string; uid: string }[] {
  return pages.flatMap((p) => {
    const lang = langFromPrismic(p.lang);
    if (!p.uid || p.uid === "home" || !lang) return [];
    return [lang === DEFAULT_LANG ? { uid: p.uid } : { lang, uid: p.uid }];
  });
}
