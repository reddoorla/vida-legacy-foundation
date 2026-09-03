/** The contact form's own words, in both locales.
 *
 *  Shared by the panel (ContactModal, which is also the contact page) and the
 *  route's action, so a failure the SERVER writes reaches the visitor in the
 *  language they are reading. It did not: `createIngestAction`'s
 *  `unavailableMessage` / `errorMessage` default to English and the factory
 *  freezes them at construction, so the Spanish form answered a failed submit
 *  in English while every other word on the page was Spanish.
 *
 *  Field NAMES are deliberately absent — they are the ingest payload's keys
 *  and stay English. The visible labels live here with the rest.
 *
 *  The register is Vilma's — usted, and the phrasing a Spanish-language
 *  nonprofit would actually use. See also $lib/ui-copy, which holds the words
 *  the CHROME supplies; this holds the ones this form does. */
import { DEFAULT_LANG, type Lang } from "$lib/locale";

const COPY = {
  en: {
    heading: "Contact us",
    lede: "Send us a message and we'll get back to you.",
    success: "Thanks — your message is on its way. We'll be in touch soon.",
    /** The client-side catch-all, and the action's own 502 copy. */
    error: "Something went wrong sending your message. Please try again.",
    /** The action's 500: the ingest endpoint is not configured at all. */
    unavailable: "The form is unavailable right now. Please try again later.",
    /** The page's meta description. Not authored in Prismic: this route has no
     *  document, so its head copy lives with the rest of its words. The site's
     *  DEFAULT_DESCRIPTION is deliberately empty (a generic line repeated on
     *  every result is worse than none), so without this the contact pages
     *  shipped with no description at all. */
    metaDescription:
      "Reach the Vida Legacy Foundation team in San Antonio: ask about financial relief for donor and recipient families, or about how to help.",
    call: "You can also call us at",
    name: "Name",
    email: "Email",
    phone: "Phone",
    message: "Message",
    send: "Send message",
    sending: "Sending…",
    required: "(required)",
  },
  es: {
    heading: "Contáctenos",
    lede: "Envíenos un mensaje y nos pondremos en contacto con usted.",
    success: "Gracias, su mensaje va en camino. Nos comunicaremos pronto.",
    error: "Algo salió mal al enviar su mensaje. Por favor, inténtelo de nuevo.",
    unavailable:
      "El formulario no está disponible en este momento. Por favor, inténtelo más tarde.",
    metaDescription:
      "Comuníquese con Vida Legacy Foundation en San Antonio: pregúntenos por la asistencia económica para familias de donantes y receptores, o por cómo ayudar.",
    call: "También puede llamarnos al",
    name: "Nombre",
    email: "Correo electrónico",
    phone: "Teléfono",
    message: "Mensaje",
    send: "Enviar mensaje",
    sending: "Enviando…",
    required: "(obligatorio)",
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type ContactCopy = (typeof COPY)[Lang];

/** The contact copy for a locale — the default's when none is given, so the
 *  panel still has words outside a localized route (the fixtures page). */
export function contactCopy(lang: Lang | undefined | null): ContactCopy {
  return COPY[lang ?? DEFAULT_LANG];
}
