import { error } from "@sveltejs/kit";
import { NotFoundError, RepositoryNotFoundError } from "@prismicio/client";

import type { PageDocument } from "../prismicio-types";
import { pageMeta } from "$lib/page-meta";
import {
  DEFAULT_LANG,
  LOCALES,
  langFromPrismic,
  pathForDoc,
  type Alternate,
  type Lang,
} from "$lib/locale";

/** The minimal client surface the loader needs — method syntax keeps the real
 *  `createClient()` return type assignable, and lets tests pass a stub. */
export type PageClient = {
  getByUID(type: "page", uid: string, params?: { lang?: string }): Promise<PageDocument>;
};

/** Load one `page` document in a locale, plus the layout's head payload.
 *
 *  Only a genuine miss (Prismic's NotFoundError: no document with that uid in
 *  that locale) becomes a 404. Everything else — an outage, a bad access
 *  token, a wrong repository name, a malformed response — is rethrown so it
 *  surfaces as a 5xx at runtime and fails a prerender loudly instead of
 *  baking a false "Page not found" into the build.
 *
 *  (The route loaders answer 404 themselves on the placeholder repo before
 *  calling this, so an unconfigured clone still builds.) */
export async function loadPage(client: PageClient, uid: string, lang: Lang = DEFAULT_LANG) {
  try {
    const page = await client.getByUID("page", uid, { lang: LOCALES[lang].prismic });
    return {
      page,
      lang,
      ogLocale: LOCALES[lang].og,
      alternates: alternatesFor(page, lang),
      ...pageMeta(page),
    };
  } catch (err) {
    // RepositoryNotFoundError extends NotFoundError but means "wrong repository
    // name", not "no such page" — that must stay loud.
    if (err instanceof NotFoundError && !(err instanceof RepositoryNotFoundError)) {
      error(404, { message: "Page not found" });
    }
    throw err;
  }
}

/** A page and its published translations as `{lang, href}` pairs — the page
 *  itself first. Feeds the hreflang alternates and the language switch. A
 *  translation in a locale the site does not serve is left out. */
export function alternatesFor(
  page: Pick<PageDocument, "uid" | "alternate_languages">,
  lang: Lang,
): Alternate[] {
  const self: Alternate = { lang, href: pathForDoc(page.uid ?? "home", lang) };
  const others = (page.alternate_languages ?? []).flatMap<Alternate>((alt) => {
    const l = langFromPrismic(alt.lang);
    return l && alt.uid ? [{ lang: l, href: pathForDoc(alt.uid, l) }] : [];
  });
  return [self, ...others];
}
