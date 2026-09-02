/** Which colouring the fixed Nav needs while it sits over the top of a page.
 *
 *  The bar is transparent, so its legibility depends on the ground the page's
 *  FIRST slice paints under it. The comps specify one navbar variant per
 *  masthead (Figma 5314:1744 / 5314:1743 / 5314:2013), and this maps the slice
 *  that draws each masthead to that variant:
 *
 *    onGreen  — HeartHero (green #9cbf5b with the grain): navbar-white, the
 *               all-cream lockup.
 *    onDark   — PageMasthead (#172303 ground): navbar, the cream wordmark with
 *               the green swoosh.
 *    default  — everything else starts on the cream page ground: the
 *               blue + green lockup.
 *
 *  Only the first slice counts. Once it scrolls out, Nav swaps to its cream
 *  "scrolled" bar and this tone no longer applies. */
export type NavTone = "default" | "onDark" | "onGreen";

type SliceLike = { slice_type: string };

const FIRST_SLICE_TONE: Record<string, NavTone> = {
  heart_hero: "onGreen",
  page_masthead: "onDark",
};

export function navToneFor(slices: readonly SliceLike[] | null | undefined): NavTone {
  const first = slices?.[0]?.slice_type;
  return (first && FIRST_SLICE_TONE[first]) || "default";
}
