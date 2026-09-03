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
 *  It also measures the footer after <main>. A sticky box is released at the
 *  end of its containing block, and the footer is outside <main> — so the
 *  closing panel would slide over the band and then the footer would push
 *  everything back into flow. <main> grows by the footer's height (its
 *  ::after spacer) and the footer is pulled up over the spacer by the same
 *  amount, both from `--footer-h` on their shared parent (the rule in
 *  app.css), so the band holds until the footer's bottom edge passes.
 *
 *  Attach to <main>. Re-collects when the slice zone changes (navigation)
 *  and re-measures on resize and on each band's — and the footer's — own
 *  resize. */
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

/** The footer <main> is followed by, if any — the element whose height the
 *  page reserves so the slide-over holds through it. */
export function footerAfter(main: Element): HTMLElement | null {
  const next = main.nextElementSibling;
  return next instanceof HTMLElement && next.tagName === "FOOTER" ? next : null;
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

  const footer = footerAfter(main);
  const host = main.parentElement;
  function measureFooter() {
    if (footer && host) host.style.setProperty("--footer-h", `${footer.offsetHeight}px`);
  }
  const footerResize =
    footer && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => measureFooter())
      : undefined;
  if (footer) footerResize?.observe(footer);

  const children = new MutationObserver(collect);
  children.observe(main, { childList: true });
  window.addEventListener("resize", measure);
  window.addEventListener("resize", measureFooter);
  collect();
  measureFooter();

  return {
    destroy() {
      children.disconnect();
      resize?.disconnect();
      footerResize?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("resize", measureFooter);
      host?.style.removeProperty("--footer-h");
    },
  };
};
