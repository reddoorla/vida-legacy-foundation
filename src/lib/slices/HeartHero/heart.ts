/** How big the open heart has to be for a given stage.
 *
 *  The comp fixes the open mask at 2696.08px wide on a 1440x860 band — which
 *  the slice used to hard-code as 187.2% of the band's WIDTH. That only holds
 *  at the comp's shape: on a portrait phone (390x664) 187.2% is 730px wide and
 *  637px tall, so the heart stopped short of the top and bottom and the green
 *  showed through. It never opened all the way.
 *
 *  What the comp really fixes is the heart against the band's HEIGHT: that
 *  same mask is 2352px tall, 2.735x the 860px band, which is why its cleft and
 *  its point are far off-screen and the photograph fills the frame. Holding
 *  that ratio reproduces 187.2% on the comp's own band and gives a phone the
 *  heart it needs (~534%).
 */

/** The mask art's aspect (static/heart-mask.png), width ÷ height. */
export const HEART_ART_RATIO = 669.436 / 584;

/** The comp's open mask height ÷ its band height. */
export const HEART_END_HEIGHT_RATIO = 2352.03 / 860;

/** The comp's own end size, and the floor for any stage wider than it is tall. */
export const HEART_END_PCT = 187.2;

/** The open size as a percentage of the stage's width. `0` for either
 *  dimension means "not measured yet" — the comp's value, which is what the
 *  server renders and what the closed heart animates towards until the first
 *  measurement lands. */
export function heartEndPct(stageWidth: number, stageHeight: number): number {
  if (!(stageWidth > 0) || !(stageHeight > 0)) return HEART_END_PCT;
  const needed = ((stageHeight * HEART_END_HEIGHT_RATIO * HEART_ART_RATIO) / stageWidth) * 100;
  return Math.max(HEART_END_PCT, needed);
}

/** Should the hero play its own opening?
 *
 *  Erik, on Discord (2026-09-03): "Do we need some sort of indicator on the
 *  hero to scroll down so that people know what to do?" — Nicole: "Or it
 *  opens on its own", "i think we can have it open on its own". So it does:
 *  two seconds after a visitor lands at the top of the page, the runway
 *  scrolls itself far enough that the heart has opened and the copy and the
 *  buttons are in.
 *
 *  Every condition here is a way of saying "only for a visitor who has just
 *  arrived and not moved": reduced motion is already on the open frame and
 *  must never be scrolled for; it runs once a session; a page that is not at
 *  the top belongs to a reader who is already reading; a hero that is not the
 *  first thing in the document is not a hero (the a11y fixtures render one
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

/** A few pixels of slack: a restored scroll position is rarely exactly 0. */
export const AUTO_OPEN_EPSILON = 4;

/** Does an open heart of `pct` cover a `w`x`h` stage? Used by the tests. */
export function heartCovers(pct: number, w: number, h: number): boolean {
  const maskW = (pct / 100) * w;
  return maskW >= w && maskW / HEART_ART_RATIO >= h;
}
