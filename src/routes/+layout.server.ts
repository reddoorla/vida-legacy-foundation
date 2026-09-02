import { building } from "$app/environment";
import type { LayoutServerLoad } from "./$types";
import { createClient, isPlaceholderRepo } from "$lib/prismicio";
import { LOCALES, langFromParam, type Lang } from "$lib/locale";
import { publishedUids } from "$lib/published-pages";

export const prerender = "auto";

export const load: LayoutServerLoad = async ({ cookies, params, fetch }) => {
  // An active Prismic preview session is signalled by this cookie: editors who
  // arrive via a Prismic preview link have it set, normal visitors never do. We
  // use it to only mount the Prismic toolbar for previewers (the toolbar sets
  // ~21 third-party cookies that otherwise hit every visitor and fail Lighthouse
  // Best Practices).
  const isPreviewSession = !!cookies.get("io.prismic.preview");

  return {
    isPreviewSession,
    publishedPages: await publishedPages(langFromParam(params.lang), { fetch, cookies }),
  };
};

/** The uids the chrome may link to: every page document published in this
 *  locale — or visible to the preview session, so a previewed release shows
 *  its own links. The site-config `page` references resolve against this
 *  list, which is what lets the nav and footer name a page before it is live
 *  without the loud-fail prerender following the link into a 404.
 *
 *  A Prismic failure fails the build: a site that silently shipped without
 *  its links is exactly what the loud-fail prerender exists to prevent. At
 *  runtime it degrades to the fallbacks instead — the page itself still
 *  renders, and the contact form still submits, through an API blip. */
async function publishedPages(
  lang: Lang,
  clientConfig: Parameters<typeof createClient>[0],
): Promise<string[]> {
  if (isPlaceholderRepo) return [];
  try {
    const pages = await createClient(clientConfig).getAllByType("page", {
      lang: LOCALES[lang].prismic,
    });
    return publishedUids(pages, lang);
  } catch (err) {
    if (building) throw err;
    console.error("site chrome: could not list the published pages", err);
    return [];
  }
}
