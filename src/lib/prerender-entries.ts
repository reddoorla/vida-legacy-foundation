import { LANGS, LOCALES, isLangPrefix, langFromPrismic, type Lang } from "$lib/locale";

/** A locale prefix: what the `[[lang=lang]]` matcher returns as the param. */
type LangPrefix = Exclude<Lang, "en">;

/** The subset of a Prismic page document the prerender entry lists need. */
export type EntryDoc = { uid: string | null; lang: string };

/** entries() for the home route: one entry per locale that has a published
 *  `home`. The default locale is `{}` (no `lang` param → "/"), others carry
 *  their prefix param → "/es". A locale with no home is simply absent, so an
 *  unpublished translation never becomes a 404 that fails the build. */
export function homeEntries(pages: readonly EntryDoc[]): { lang?: LangPrefix }[] {
  return LANGS.filter((l) =>
    pages.some((p) => p.uid === "home" && p.lang === LOCALES[l].prismic),
  ).map((l) => (isLangPrefix(l) ? { lang: l } : {}));
}

/** entries() for the [uid] route: every published page document, in its own
 *  locale, except home (which renders at the locale root). Documents in a
 *  locale the site does not serve are skipped. */
export function pageEntries(pages: readonly EntryDoc[]): { lang?: LangPrefix; uid: string }[] {
  return pages.flatMap((p) => {
    const lang = langFromPrismic(p.lang);
    if (!p.uid || p.uid === "home" || !lang) return [];
    return [isLangPrefix(lang) ? { lang, uid: p.uid } : { uid: p.uid }];
  });
}
