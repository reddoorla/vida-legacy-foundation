import { error } from "@sveltejs/kit";

import { loadPage } from "$lib/page-load";
import { createClient, isPlaceholderRepo } from "$lib/prismicio";
import { langFromParam } from "$lib/locale";
import { homeEntries } from "$lib/prerender-entries";

export async function load({ params, fetch, cookies }) {
  // An unconfigured template has no content: answer 404 (which the
  // placeholder-repo prerender rule in svelte.config.js tolerates) instead of
  // querying a repository that does not exist and failing the build with a 500.
  if (isPlaceholderRepo) error(404, { message: "Page not found" });

  // The homepage is the `page` document with uid "home", in the locale the
  // URL prefix selects ("/" → en-us, "/es" → es-mx).
  return loadPage(createClient({ fetch, cookies }), "home", langFromParam(params.lang));
}

// Prerender "/" and, once a Spanish home is published, "/es". Skipped on an
// unconfigured starter — the load above would 404 on the placeholder repo and
// fail the build. (No SvelteKit `fetch` here — `entries()` has no request
// event; the client falls back to global fetch, which is fine at build time.)
export async function entries() {
  if (isPlaceholderRepo) return [];

  return homeEntries(await createClient().getAllByType("page", { lang: "*" }));
}
