/** The page opening itself for a visitor who has just arrived.
 *
 *  Erik, on Discord (2026-09-03): "Do we need some sort of indicator on the
 *  hero to scroll down so that people know what to do?" — Nicole: "Or it opens
 *  on its own", "i think we can have it open on its own". So a scroll-runway
 *  band does: a beat after the visitor lands at the top, the runway is
 *  scrolled for them, far enough that the band has opened and its copy is in.
 *  Any wheel, touch, key or pointer cancels it on the spot — it is a
 *  suggestion, not a ride.
 *
 *  This lives here rather than beside the hero because two bands open this
 *  way: the home page's HeartHero, and the PageMasthead that opens /about and
 *  /donate (Nicole, 2026-09-09: "could the about page open automatically as
 *  well?"). The band supplies its own runway, storage key and how far through
 *  to go; everything else — when to decline, when to cancel, and the easing —
 *  is the same mechanism and is stated once. */

/** A few pixels of slack: a restored scroll position is rarely exactly 0. */
export const AUTO_OPEN_EPSILON = 4;

/** Should this band play its own opening?
 *
 *  Every condition here is a way of saying "only for a visitor who has just
 *  arrived and not moved": reduced motion is already on the open frame and
 *  must never be scrolled for; it runs once a session; a page that is not at
 *  the top belongs to a reader who is already reading; a band that is not the
 *  first thing in the document is not an opening (the a11y fixtures render one
 *  half way down the page); and a runway that does not exist cannot be
 *  played. */
export function shouldAutoOpen(state: {
  reducedMotion: boolean;
  alreadyPlayed: boolean;
  scrollY: number;
  /** The section's distance from the top of the DOCUMENT. */
  documentTop: number;
  /** Section height minus the viewport — the scroll the opening is spread over. */
  runway: number;
}): boolean {
  const { reducedMotion, alreadyPlayed, scrollY, documentTop, runway } = state;
  if (reducedMotion || alreadyPlayed || runway <= 0) return false;
  return documentTop <= AUTO_OPEN_EPSILON && scrollY <= AUTO_OPEN_EPSILON;
}

/** Does the stored "already played" mark still apply to THIS page load?
 *
 *  The mark exists so the opening does not replay every time a visitor
 *  navigates back to the page — home → about → home is a soft navigation, the
 *  mark survives it, and the band stays where they left it. That is what it is
 *  for and it still does it.
 *
 *  A reload is not that. It re-requests the page, and the browser puts the
 *  visitor back where they were — which, if they were at the top, is frame 0:
 *  for the hero, a green field with a small closed heart and NOTHING else. The
 *  eyebrow, the heading, both calls to action and the bar are all revealed by
 *  scroll progress, so at rest the band carries no message and nothing to act
 *  on, and the mark guaranteed it would stay that way for the rest of the
 *  session. That is the exact state the opening was added to prevent.
 *
 *  Discarding the mark on a reload is safe because it is not the only guard:
 *  `shouldAutoOpen` still requires the visitor to be at the top of the page, so
 *  a refresh anywhere else — where the scroll is restored mid-runway and the
 *  band is already open — declines on the scroll test instead, and nobody
 *  reading has the page moved under them. */
export function playedThisSession(
  stored: string | null,
  navigationType: string | undefined,
): boolean {
  if (navigationType === "reload") return false;
  return stored === "1";
}

/** How this page load was reached, if the browser will say. */
export function navigationType(): string | undefined {
  const entries = performance?.getEntriesByType?.("navigation");
  return (entries?.[0] as PerformanceNavigationTiming | undefined)?.type;
}

/** The beat before it starts, and how long it takes. */
const AUTO_OPEN_DELAY = 2000;
const AUTO_OPEN_MS = 1800;

/** What calls it off. Any of these means the visitor is already driving. */
const GESTURES = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

export type AutoOpenOptions = {
  /** The band carrying the scroll runway. */
  section: HTMLElement;
  reducedMotion: boolean;
  /** The sessionStorage mark. One per band: /about and /donate both draw a
   *  PageMasthead, and opening one must not spend the other's turn. */
  key: string;
  /** How far through the runway to go — far enough that the copy is in. */
  through: number;
  delay?: number;
  duration?: number;
};

/** Play the opening for this band, and return the way to stop it.
 *
 *  The returned function is both the cancel and the cleanup: it is handed to
 *  every gesture listener AND returned to the caller's `$effect`, so a
 *  component that goes away mid-beat takes the timer, the frame and the
 *  listeners with it. */
export function runAutoOpen(opts: AutoOpenOptions): () => void {
  const {
    section,
    reducedMotion,
    key,
    through,
    delay = AUTO_OPEN_DELAY,
    duration = AUTO_OPEN_MS,
  } = opts;
  const nothingToStop = () => {};
  if (reducedMotion) return nothingToStop;

  let alreadyPlayed = true;
  try {
    alreadyPlayed = playedThisSession(sessionStorage.getItem(key), navigationType());
  } catch {
    // Private mode or a blocked store: treat it as already played rather than
    // replaying the opening on every navigation back to this page.
  }

  const rect = section.getBoundingClientRect();
  if (
    !shouldAutoOpen({
      reducedMotion,
      alreadyPlayed,
      scrollY: window.scrollY,
      documentTop: rect.top + window.scrollY,
      runway: rect.height - window.innerHeight,
    })
  )
    return nothingToStop;

  let raf = 0;
  const timer = window.setTimeout(play, delay);

  const cancel = () => {
    window.clearTimeout(timer);
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    // app.css sets `scroll-behavior: smooth` on <html>, which would animate
    // every step of our own animation on top of it.
    document.documentElement.style.scrollBehavior = "";
    for (const type of GESTURES) window.removeEventListener(type, cancel);
  };

  for (const type of GESTURES) window.addEventListener(type, cancel, { passive: true });

  function play() {
    // Re-checked rather than trusted: the beat is two seconds long, and the
    // page can have been scrolled or resized inside it.
    if (window.scrollY > AUTO_OPEN_EPSILON) return cancel();
    const r = section.getBoundingClientRect();
    const runway = r.height - window.innerHeight;
    if (runway <= 0) return cancel();
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      // Nothing to remember it by; the guards above still hold within a page.
    }
    const from = window.scrollY;
    const to = r.top + from + runway * through;
    const started = performance.now();
    document.documentElement.style.scrollBehavior = "auto";
    const step = (now: number) => {
      const t = Math.min((now - started) / duration, 1);
      // Ease out: it leaves quickly and settles, so it reads as the page
      // showing itself rather than as a scroll being taken from you.
      window.scrollTo(0, from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(step);
      else cancel();
    };
    raf = requestAnimationFrame(step);
  }

  return cancel;
}
