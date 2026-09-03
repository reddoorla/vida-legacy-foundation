/**
 * Helpers for serving responsively-sized Prismic (imgix) images.
 *
 * Prismic image URLs are imgix URLs, so appending `w`/`auto`/`q` query params
 * makes the CDN return a correctly-sized, modern-format (WebP/AVIF) image.
 * Without a width param the full-resolution source is shipped — typically the
 * single largest Lighthouse performance cost (multi-MB heroes served into
 * ~800px boxes). See `srcset()` / `imgix()` below.
 */

const PRISMIC_IMAGE_HOST = "images.prismic.io";

/** Width breakpoints used to build srcset candidates (device-pixel aware). */
export const DEFAULT_IMAGE_WIDTHS = [480, 768, 1024, 1440, 1920, 2560];

/**
 * True when `url` is a Prismic/imgix asset we can transform with query params.
 * Matches on the parsed hostname (not a substring) so a non-imgix URL that
 * merely mentions the host in its path can't be rewritten.
 */
export function isPrismicImageUrl(url: string | null | undefined): url is string {
  if (typeof url !== "string") return false;
  try {
    return new URL(url).hostname === PRISMIC_IMAGE_HOST;
  } catch {
    return false;
  }
}

/**
 * Return `url` with imgix params applied. Always sets `auto=format,compress`.
 * Non-Prismic or malformed URLs are returned unchanged.
 */
export function imgix(
  url: string | null | undefined,
  params: Record<string, string | number> = {},
): string {
  if (!url) return "";
  if (!isPrismicImageUrl(url)) return url;
  const u = new URL(url);
  u.searchParams.set("auto", "format,compress");
  // Prismic crop URLs ship `rect` + `w` + `h` together. Overriding only `w`
  // would leave the stale `h` behind, and imgix's default `fit=clip` then caps
  // the real output width to preserve that (now wrong) box — so the srcset
  // width descriptor would lie about the delivered pixels. Setting one
  // dimension drops the other unless the caller supplies both.
  if ("w" in params && !("h" in params)) u.searchParams.delete("h");
  if ("h" in params && !("w" in params)) u.searchParams.delete("w");
  for (const [key, value] of Object.entries(params)) {
    u.searchParams.set(key, String(value));
  }
  return u.toString();
}

/** Widths for the phone-shaped (portrait) art-directed source. A full-bleed
 *  hero is as tall as the viewport there, so the delivered pixels must cover
 *  a ~390–1170 CSS-pixel column at 1–3x, not the 480 the landscape ladder
 *  would pick for the same box. */
/** The shape a full-bleed hero takes on a phone: taller than 9:16, so
 *  object-cover trims a little rather than leaving a gap at any handset. */
export const PORTRAIT_HERO_ASPECT = 16 / 9;

export const PORTRAIT_IMAGE_WIDTHS = [390, 480, 640, 780, 900, 1170];

/**
 * A face-aware PORTRAIT crop ladder for a Prismic (imgix) image: each
 * candidate is cropped to `aspect` (height ÷ width) around any face imgix
 * finds, falling back to the centre.
 *
 * Why: a landscape master dropped into a phone-shaped box is centre-cropped
 * by `object-cover`, which both loses the composition (the about masthead
 * framed the man's forehead) and magnifies whichever candidate the browser
 * picked for the box's WIDTH — a 390px-wide file scaled 2.8x to cover a
 * 664px-tall box. Cropping at the CDN fixes the framing and delivers real
 * pixels.
 *
 * Returns `undefined` for non-Prismic URLs so the <source> can be omitted.
 */
export function portraitSrcset(
  url: string | null | undefined,
  aspect: number,
  widths: number[] = PORTRAIT_IMAGE_WIDTHS,
): string | undefined {
  if (!isPrismicImageUrl(url)) return undefined;
  return widths
    .map(
      (w) =>
        `${imgix(url, { w, h: Math.round(w * aspect), fit: "crop", crop: "faces,center" })} ${w}w`,
    )
    .join(", ");
}

/**
 * Build a width-descriptor srcset for a Prismic image URL.
 * Returns `undefined` for non-Prismic URLs so the attribute can be omitted.
 */
export function srcset(
  url: string | null | undefined,
  widths: number[] = DEFAULT_IMAGE_WIDTHS,
): string | undefined {
  if (!isPrismicImageUrl(url)) return undefined;
  return widths.map((w) => `${imgix(url, { w })} ${w}w`).join(", ");
}
