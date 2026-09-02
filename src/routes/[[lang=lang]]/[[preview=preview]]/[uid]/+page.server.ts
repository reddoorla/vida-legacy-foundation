import { error, redirect } from "@sveltejs/kit";

import { loadPage } from "$lib/page-load";
import { createClient, isPlaceholderRepo } from "$lib/prismicio";
import { langFromParam, pathForDoc } from "$lib/locale";
import { pageEntries } from "$lib/prerender-entries";

export async function load({ params, fetch, cookies }) {
  const lang = langFromParam(params.lang);
  if (params.uid === "home") redirect(308, pathForDoc("home", lang));

  // See the root route: an unconfigured template answers 404 rather than
  // asking a repository that does not exist.
  if (isPlaceholderRepo) error(404, { message: "Page not found" });

  return loadPage(createClient({ fetch, cookies }), params.uid, lang);
}

// Prerender every page document at its real route, in its own locale ("about"
// → "/about", the es-mx "about" → "/es/about"). "home" renders at the locale
// root via the root route, so it is excluded here. Empty on an unconfigured
// starter so `pnpm build` succeeds before the Prismic repo is wired.
export async function entries() {
  if (isPlaceholderRepo) return [];

  return pageEntries(await createClient().getAllByType("page", { lang: "*" }));
}
