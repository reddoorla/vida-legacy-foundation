/** The hero's photograph, moving.
 *
 *  Erik supplied the hero as an iStock *clip* (1831051144), not a photograph —
 *  and the comp's "photo" turned out to be frame 1 of that clip, which is why
 *  the still never had an iStock photo id anyone could buy. The still and the
 *  clip are therefore the same licensed asset, and the still is the clip's
 *  poster: they agree frame-for-frame, so nothing flashes when one covers the
 *  other and a refused autoplay is invisible.
 *
 *  **The clip is hosted on Vimeo, not here.** That is the fleet's pattern, not
 *  a preference — see `$lib/components/VimeoBackground.svelte` for the
 *  mechanism and the two defects it exists to avoid. This site's CSP was
 *  already provisioned for it before this slice needed it
 *  (`player.vimeo.com` under script-src and frame-src, `*.vimeocdn.com` under
 *  media-src), which is the tell that self-hosting an mp4 was the wrong road.
 *
 *  The clip is an ENHANCEMENT over the image, never a replacement. The image
 *  renders on the server and stays in the DOM; the player is layered over it
 *  only once a client has proved it both can and should play it. Three
 *  visitors get the still and never pay for an embed:
 *
 *    - **No JS.** The iframe is created client-side, so a scriptless render has
 *      no element and no request. Unlike the nav's entry list this needs
 *      nothing in app.html's `<noscript><style>` block — there is no element to
 *      reveal, which is the cheapest possible version of that rule.
 *    - **Reduced motion.** A ten-second clip looping behind the page's heading
 *      is precisely what WCAG 2.2.2 is about, and this site already lands
 *      reduced motion on the hero's *final* frame rather than its first.
 *    - **A phone.** Below 768px `HeroBackgroundImage` serves a face-aware
 *      portrait crop (imgix `crop=faces`). An iframe cannot be `object-fit`
 *      cropped at all — see `coverBox` — and scaling a 16:9 player to cover a
 *      390x664 frame throws away both faces. The threshold below is
 *      deliberately the image's own portrait breakpoint rather than a new one;
 *      two numbers that both mean "is this a phone" drift apart.
 */

/** Where the landscape master takes over from the face-aware portrait crop.
 *  Must stay equal to the `portraitMedia` breakpoint the slice passes to
 *  `HeroBackgroundImage`; `heroVideo.test.ts` pins them together. */
export const HERO_VIDEO_MIN_WIDTH = 768;

export const HERO_VIDEO_MEDIA = `(min-width: ${HERO_VIDEO_MIN_WIDTH}px)`;

/** Every Vimeo `background=1` embed is 16:9 regardless of the source file. */
export const VIDEO_ASPECT = 16 / 9;

/** Should this client mount the player at all?
 *
 *  Every `false` here means "render the still and request nothing" — the point
 *  is that declining is free, not that it degrades. */
export function shouldPlayHeroVideo(state: {
  hasVideo: boolean;
  reducedMotion: boolean;
  wide: boolean;
}): boolean {
  const { hasVideo, reducedMotion, wide } = state;
  return hasVideo && !reducedMotion && wide;
}

/** The size a 16:9 player has to be to COVER a stage, centred.
 *
 *  `object-fit: cover` does not apply to an iframe: the embed lays itself out
 *  to the element's box and letterboxes inside it, so a 16:9 player in a
 *  1440x860 stage (1.674) would paint bars top and bottom — inside the heart,
 *  where "bar" means the green ground showing through a hole in the
 *  photograph. The fleet's VimeoBanner dodges this by making its own section
 *  `aspect-video`; this stage cannot, because its shape is the comp's and on a
 *  phone it is taller than it is wide.
 *
 *  So the cover box is computed rather than expressed in CSS, from the stage
 *  measurements the slice already takes for `heartEndPct`. `0` for either
 *  dimension means "not measured yet" and yields a zero box, which keeps the
 *  player unmounted rather than briefly full-bleed at the wrong size. */
export function coverBox(
  stageWidth: number,
  stageHeight: number,
): { width: number; height: number } {
  if (!(stageWidth > 0) || !(stageHeight > 0)) return { width: 0, height: 0 };
  if (stageWidth / stageHeight >= VIDEO_ASPECT) {
    return { width: stageWidth, height: stageWidth / VIDEO_ASPECT };
  }
  return { width: stageHeight * VIDEO_ASPECT, height: stageHeight };
}

/** Does `coverBox` actually cover? Used by the tests. */
export function videoCovers(stageWidth: number, stageHeight: number): boolean {
  const { width, height } = coverBox(stageWidth, stageHeight);
  // A hair of tolerance for the float division; a sub-pixel shortfall is not a
  // visible bar, but a systematic one would be.
  return width >= stageWidth - 0.001 && height >= stageHeight - 0.001;
}

/** Track the width threshold, reporting the current answer immediately.
 *
 *  Answers `false` where `matchMedia` is missing (SSR, and jsdom without a
 *  stub) so the server renders no player and hydration adds one only if the
 *  real viewport earns it. Returns its own teardown. */
export function watchWide(onChange: (wide: boolean) => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    onChange(false);
    return () => {};
  }
  const mq = window.matchMedia(HERO_VIDEO_MEDIA);
  onChange(mq.matches);
  const handler = (event: MediaQueryListEvent) => onChange(event.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
