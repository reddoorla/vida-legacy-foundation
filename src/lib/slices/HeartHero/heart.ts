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

/** Does an open heart of `pct` cover a `w`x`h` stage? Used by the tests. */
export function heartCovers(pct: number, w: number, h: number): boolean {
  const maskW = (pct / 100) * w;
  return maskW >= w && maskW / HEART_ART_RATIO >= h;
}
