import { createClient, isPlaceholderRepo } from "$lib/prismicio";
import { DEFAULT_LANG, langFromPrismic, pathForDoc } from "$lib/locale";
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

  const urls = entries.map(
    ({ path, lastmod }) => `  <url>
    <loc>${origin}${path}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`,
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
};
