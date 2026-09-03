/** The chrome's own words, in both locales.
 *
 *  Everything a visitor reads on this site comes from Prismic in the
 *  document's language — except the words the CHROME supplies itself: the
 *  skip link, the menu's controls, the language switch's accessible name, a
 *  dialog's close button. Those are code, so they live here and are keyed by
 *  the page's locale, exactly as the contact and donation forms keep their
 *  field labels (see CLAUDE.md). Without this the Spanish site announced
 *  "Open menu" and "Skip to main content" to a screen reader.
 *
 *  The register is Vilma's — usted, and the phrasing a Spanish-language
 *  nonprofit would actually use, not a word-for-word translation. */
import { DEFAULT_LANG, type Lang } from "$lib/locale";

const COPY = {
  en: {
    /** The skip link, the first thing in the tab order. */
    skipToContent: "Skip to main content",
    /** Alt text for the lockup, which is a link to the locale's home. */
    homeLink: "Vida Legacy Foundation home",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    /** The open menu's accessible name (it is a dialog). */
    menu: "Menu",
    /** The EN | ES toggle's group name. */
    language: "Language",
    /** A dialog's close button. */
    close: "Close",
    /** A person card opens their bio; the card itself is the button. */
    readBio: (name: string) => `Read the bio for ${name}`,
    /** Stands in for a name the CMS has not filled. */
    thisPerson: "this person",
    /** The phone-in-landscape cover. */
    portraitPlease: "Please switch to portrait mode",
    /** The error page. A 404 is the only status a visitor routinely meets, and
     *  the message SvelteKit carries with it is written for a log, in English —
     *  so the page says its own words instead of rendering that one. */
    pageNotFound: "We couldn't find that page.",
    somethingWentWrong: "Something went wrong.",
    goHome: "Go home",
    /** Slider's controls (no production slice uses it yet — the fixtures do). */
    playSlides: "Play slides",
    pauseSlides: "Pause slides",
    previousSlide: "Previous slide",
    nextSlide: "Next slide",
    goToSlide: (n: number) => `Go to slide ${n}`,
    slideCount: (n: number, total: number) => `Slide ${n} of ${total}`,
    slideRange: (from: number, to: number, total: number) =>
      `Slides ${from} through ${to} of ${total}`,
    ofCount: (n: number, total: number) => `${n} of ${total}`,
  },
  es: {
    skipToContent: "Saltar al contenido principal",
    homeLink: "Inicio de Vida Legacy Foundation",
    openMenu: "Abrir el menú",
    closeMenu: "Cerrar el menú",
    menu: "Menú",
    language: "Idioma",
    close: "Cerrar",
    readBio: (name: string) => `Leer la biografía de ${name}`,
    thisPerson: "esta persona",
    portraitPlease: "Por favor, gire su dispositivo a la posición vertical",
    pageNotFound: "No pudimos encontrar esa página.",
    somethingWentWrong: "Algo salió mal.",
    goHome: "Ir al inicio",
    playSlides: "Reproducir las diapositivas",
    pauseSlides: "Pausar las diapositivas",
    previousSlide: "Diapositiva anterior",
    nextSlide: "Diapositiva siguiente",
    goToSlide: (n: number) => `Ir a la diapositiva ${n}`,
    slideCount: (n: number, total: number) => `Diapositiva ${n} de ${total}`,
    slideRange: (from: number, to: number, total: number) =>
      `Diapositivas ${from} a ${to} de ${total}`,
    ofCount: (n: number, total: number) => `${n} de ${total}`,
  },
} as const satisfies Record<
  Lang,
  Record<
    string,
    | string
    | ((a: never) => string)
    | ((a: never, b: never) => string)
    | ((a: never, b: never, c: never) => string)
  >
>;

export type UiCopy = (typeof COPY)[Lang];

/** The chrome copy for a locale — the default locale's when none is given, so
 *  a component rendered outside a localized route (the fixtures page, a unit
 *  test) still has words. */
export function ui(lang: Lang | undefined | null): UiCopy {
  return COPY[lang ?? DEFAULT_LANG];
}
