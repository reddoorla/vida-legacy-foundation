import { env } from "$env/dynamic/private";
import { createIngestAction } from "@reddoorla/maintenance/forms";
import { LANGS, langFromParam, type Lang } from "$lib/locale";
import { contactCopy } from "$lib/contact-copy";
import type { Actions, PageServerLoad } from "./$types";

// The root layout sets `prerender = "auto"`; a form `action` cannot run on a
// prerendered route ("Cannot prerender pages with actions"). Opt out — this
// route is genuinely dynamic.
export const prerender = false;

// Plant a per-request timestamp for the bot timing screen. `title` and
// `meta_description` flow to the root layout's <Seo> (static routes set head
// via data, not their own tags). This route has no Prismic document, so its
// head copy is the panel's own — and without the description it shipped with
// none at all, since DEFAULT_DESCRIPTION is deliberately empty.
export const load: PageServerLoad = ({ params }) => {
  const lang = langFromParam(params.lang);
  return {
    formTs: Date.now(),
    lang,
    title: lang === "es" ? "Contáctenos" : "Contact",
    meta_description: contactCopy(lang).metaDescription,
  };
};

// The action's own failure copy is built per REQUEST, in the request's locale.
// `createIngestAction` freezes `unavailableMessage` / `errorMessage` at
// construction and defaults them to English, so a single action meant the
// Spanish form answered a failed submit in English while every other word on
// the page was Spanish. The strings are the panel's own ($lib/contact-copy),
// so the two can never drift.
const ingestFor = (lang: Lang) => {
  const copy = contactCopy(lang);
  return createIngestAction({
    formType: "contact",
    unavailableMessage: copy.unavailable,
    errorMessage: copy.error,
    getConfig: () => ({
      url: env.FORMS_INGEST_URL,
      token: env.FORMS_INGEST_TOKEN,
    }),
    buildPayload: (form, event) => ({
      name: form.get("name")?.toString(),
      email: form.get("email")?.toString(),
      phone: form.get("phone")?.toString(),
      message: form.get("message")?.toString(),
      // Full URL incl. query string so UTM/campaign params (?utm_source=…) are captured.
      sourceUrl: event.url.href,
      // Synthetic end-to-end probe marker (the fleet `form-e2e` audit). Forwarded
      // ONLY when the submitted form carries testMode=true — a real visitor never
      // sets it. Rides through as an extraField (no schema change); central ingest
      // recognizes it and routes the submission away from every real sink.
      testMode: form.get("testMode")?.toString() === "true" || undefined,
    }),
  });
};

// One action per locale, built once; the request picks the one whose words
// match the page it was posted from.
const INGEST = Object.fromEntries(LANGS.map((l) => [l, ingestFor(l)])) as Record<
  Lang,
  ReturnType<typeof ingestFor>
>;

export const actions: Actions = {
  default: (event) => INGEST[langFromParam(event.params.lang)](event),
};
