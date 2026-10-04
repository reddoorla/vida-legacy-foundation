import type { Handle } from "@sveltejs/kit";
import { LOCALES, langFromParam } from "$lib/locale";
import { isCmsFramedRoute, widenFrameAncestors } from "$lib/security/cms-framing";

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
  // The one route the Prismic Type Builder frames from another origin carries
  // no X-Frame-Options and names its framers in the CSP; every other response
  // stays SAMEORIGIN with kit.csp's `frame-ancestors 'self'`.
  if (isCmsFramedRoute(event.url.pathname)) {
    response.headers.delete("X-Frame-Options");
    const policy = response.headers.get("Content-Security-Policy");
    if (policy) response.headers.set("Content-Security-Policy", widenFrameAncestors(policy));
  } else {
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
  }
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
};
