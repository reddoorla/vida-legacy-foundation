<script lang="ts">
  import { page } from "$app/state";
  import { langFromParam, pathForDoc } from "$lib/locale";
  import { ui } from "$lib/ui-copy";

  const lang = $derived(langFromParam(page.params.lang));
  const copy = $derived(ui(lang));

  // A 404 is the only status a visitor routinely meets, and the message
  // SvelteKit carries with it is written for a log — "Not found", in English,
  // from `error(404, …)` in the loaders. So the page says its OWN words in the
  // page's language and keeps the carried message only for the statuses a
  // visitor is not expected to read (a 500's detail is still useful to whoever
  // is reading over their shoulder).
  const message = $derived(
    page.status === 404 ? copy.pageNotFound : (page.error?.message ?? copy.somethingWentWrong),
  );
</script>

<svelte:head>
  <title>{page.status} — {message}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
  <h1>{page.status}</h1>
  <p class="mt-4 text-lg opacity-70">
    {message}
  </p>
  <a href={pathForDoc("home", lang)} class="mt-8 underline hover:no-underline">
    {copy.goHome}
  </a>
</div>
