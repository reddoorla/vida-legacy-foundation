import type { Handle } from "@sveltejs/kit";
import { LOCALES, langFromParam } from "$lib/locale";

export const handle: Handle = async ({ event, resolve }) => {
  // app.html carries `lang="%lang%"`; the URL prefix decides the document
  // language ("/es/…" → es). Routes outside [[lang]] (dev, api) are English.
  const lang = LOCALES[langFromParam(event.params.lang)].html;
  const response = await resolve(event, {
    // replaceAll, not replace: a first match anywhere else in the chunk (a
    // comment, a code sample) would otherwise leave the <html> tag with the
    // placeholder — an invalid lang the axe gate rightly fails.
    transformPageChunk: ({ html }) => html.replaceAll("%lang%", lang),
  });

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
};
