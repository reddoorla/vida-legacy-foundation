import { createClient, isPlaceholderRepo } from "$lib/prismicio";
import {
  DEFAULT_LANG,
  LANGS,
  LOCALIZED_STATIC_ROUTES,
  langFromPrismic,
  localizePath,
  pathForDoc,
} from "$lib/locale";
import type { RequestHandler } from "./$types";

export const prerender = true;

export const GET: RequestHandler = async ({ fetch, url }) => {
  const origin = url.origin;

  // One entry per page document in every locale ("home" renders at the
  // locale root: "/" and "/es"). Empty on an unconfigured starter so the
  // prerender succeeds before Prismic is wired.
  const entries: { path: string; lastmod: string }[] = isPlaceholderRepo
    ? []
    : (await createClient({ fetch }).getAllByType("page", { lang: "*" })).map((page) => ({
        path: pathForDoc(page.uid ?? "home", langFromPrismic(page.lang) ?? DEFAULT_LANG),
        lastmod: new Date(page.last_publication_date ?? Date.now()).toISOString(),
      }));

  // Routes that exist in every locale with no Prismic document behind them —
  // /contact and /es/contact. They were absent until 2026-09-04: the map above
  // enumerates `page` documents, and the contact route is not one, so the only
  // two crawlable URLs the CMS does not own were the two the sitemap omitted.
  // Driven off LOCALIZED_STATIC_ROUTES rather than hard-coded, so this is the
  // same list the language switch trusts and the two cannot drift apart.
  //
  // No `lastmod`: it is optional in the sitemap spec, and the honest
  // alternatives are both worse — there is no publication date to report, and
  // stamping build time would rewrite the sitemap on every deploy and tell
  // crawlers a page changed when it did not.
  const staticPaths = LOCALIZED_STATIC_ROUTES.flatMap((route) =>
    LANGS.map((lang) => localizePath(route, lang)),
  );

  const urls = [
    ...entries.map(
      ({ path, lastmod }) => `  <url>
    <loc>${origin}${path}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`,
    ),
    ...staticPaths.map(
      (path) => `  <url>
    <loc>${origin}${path}</loc>
  </url>`,
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
};
