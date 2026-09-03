/** Keeps the pin offset of the page's slide-over bands honest.
 *
 *  A `.sticky-cover` band — and the band before the closing cream panel,
 *  which app.css pins by rule so that panel always slides over what precedes
 *  it — is `position: sticky; top: var(--sticky-top)`. For a band shorter
 *  than the viewport the offset is 0: it holds at the top while the next one
 *  scrolls over it. For a taller band 0 would hide its lower half for good
 *  (a sticky element never scrolls past its offset), so the offset goes
 *  negative by the excess and the band holds with its bottom edge at the
 *  bottom of the viewport instead. Heights change with content, viewport
 *  and fonts, so it is measured, not styled.
 *
 *  Attach to <main>. Re-collects when the slice zone changes (navigation)
 *  and re-measures on resize and on each band's own resize. */
import type { Action } from "svelte/action";

const CLOSING = 'section[data-slice-type="cta_banner"][data-slice-variation="onCream"]';

/** The bands app.css pins: marked ones, and the one before the closing panel. */
export function stickyBands(main: ParentNode): HTMLElement[] {
  return Array.from(main.children).filter((el): el is HTMLElement => {
    if (!(el instanceof HTMLElement) || el.tagName !== "SECTION") return false;
    if (el.classList.contains("sticky-cover")) return true;
    const next = el.nextElementSibling;
    return !!next && next.matches(CLOSING);
  });
}

export function stickyTop(bandHeight: number, viewportHeight: number): number {
  return Math.min(0, viewportHeight - bandHeight);
}

export const stickyCovers: Action<HTMLElement> = (main) => {
  let bands: HTMLElement[] = [];
  const resize =
    typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => measure());

  function measure() {
    const vh = window.innerHeight;
    for (const band of bands) {
      band.style.setProperty("--sticky-top", `${stickyTop(band.offsetHeight, vh)}px`);
    }
  }

  function collect() {
    resize?.disconnect();
    for (const band of bands) band.style.removeProperty("--sticky-top");
    bands = stickyBands(main);
    for (const band of bands) resize?.observe(band);
    measure();
  }

  const children = new MutationObserver(collect);
  children.observe(main, { childList: true });
  window.addEventListener("resize", measure);
  collect();

  return {
    destroy() {
      children.disconnect();
      resize?.disconnect();
      window.removeEventListener("resize", measure);
    },
  };
};
