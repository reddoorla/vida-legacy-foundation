import { redirectToPreviewURL } from "@prismicio/svelte/kit";
import { createClient, linkResolver } from "$lib/prismicio";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ fetch, request, cookies }) => {
  const client = createClient({ fetch });

  // The helper takes no resolver of its own, and this client is routes-free
  // (see $lib/prismicio), so without help every preview would land on "/".
  // Hand it a client whose resolvePreviewURL carries the locale-aware
  // linkResolver: an es-mx document previews at its "/es/…" URL.
  return await redirectToPreviewURL({
    client: {
      resolvePreviewURL: (args) => client.resolvePreviewURL({ ...args, linkResolver }),
    },
    request,
    cookies,
  });
};
