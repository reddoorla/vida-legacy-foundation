import { langFromPrismic, type Lang } from "$lib/locale";
import type { EntryDoc } from "$lib/prerender-entries";

/** The uids of the page documents published in `lang`, from a
 *  `getAllByType("page", …)` result — what the chrome's `page` references
 *  resolve against (see `loadSiteConfig`). Documents in other locales are
 *  ignored, so a published English page never lends its uid to the Spanish
 *  nav. */
export function publishedUids(pages: EntryDoc[], lang: Lang): string[] {
  const uids = new Set<string>();
  for (const doc of pages) {
    if (doc.uid && langFromPrismic(doc.lang) === lang) uids.add(doc.uid);
  }
  return [...uids];
}
