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
 *  `.sticky-cover--bottom` holds by its bottom edge at ANY height: the offset
 *  is the full difference, positive for a short band. That is the homepage's
 *  closing statement, which the client asked to come to rest at the bottom of
 *  the screen rather than the top — the band itself keeps the comp's height
 *  and the comp's 60px above the line, and only the resting edge changes.
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

/** Which edge of the band comes to rest against the viewport. */
export type StickyAnchor = "top" | "bottom";

export const BOTTOM_ANCHOR = "sticky-cover--bottom";

export function anchorOf(band: Element): StickyAnchor {
  return band.classList.contains(BOTTOM_ANCHOR) ? "bottom" : "top";
}

export function stickyTop(
  bandHeight: number,
  viewportHeight: number,
  anchor: StickyAnchor = "top",
): number {
  const bottomEdge = viewportHeight - bandHeight;
  return anchor === "bottom" ? bottomEdge : Math.min(0, bottomEdge);
}

/** The sections the closing cream panel rolls up over, and where each one
 *  holds while it does.
 *
 *  Pinning only the band before the panel made that band feel detached: it
 *  stopped dead while "By the numbers" and "Compassion in Action" kept
 *  scrolling behind it. The panel is supposed to come over the PAGE. So the
 *  run walks back from the panel, stacking each section on the one below it
 *  — its bottom edge against that section's top — until the stack fills the
 *  viewport, and every section in it therefore pins on the same scroll
 *  position. The whole screen holds still and only the panel moves.
 *
 *  It stops at a band that is already `.sticky-cover`: that one is holding on
 *  its own account (the homepage's full-bleed photograph, at the top of the
 *  screen), so it fills whatever the stack does not.
 *
 *  Heights come from `height` so a test can supply them; jsdom lays nothing
 *  out. */
export function coverRun(
  main: ParentNode,
  viewportHeight: number,
  height: (el: HTMLElement) => number,
): { el: HTMLElement; top: number }[] {
  const sections = Array.from(main.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.tagName === "SECTION",
  );
  const panel = sections.findIndex((el) => el.matches(CLOSING));
  if (panel < 1) return [];
  const anchor = sections[panel - 1];
  let top = stickyTop(height(anchor), viewportHeight, anchorOf(anchor));
  let stacked = height(anchor);
  const run: { el: HTMLElement; top: number }[] = [];
  for (let i = panel - 2; i >= 0 && stacked < viewportHeight; i--) {
    const el = sections[i];
    if (el.classList.contains("sticky-cover")) break;
    top -= height(el);
    stacked += height(el);
    run.unshift({ el, top });
  }
  return run;
}

/** The footer <main> is followed by, if any — the element whose height the
 *  page reserves so the slide-over holds through it. */
export function footerAfter(main: Element): HTMLElement | null {
  const next = main.nextElementSibling;
  return next instanceof HTMLElement && next.tagName === "FOOTER" ? next : null;
}

export const stickyCovers: Action<HTMLElement> = (main) => {
  let bands: HTMLElement[] = [];
  let observed: HTMLElement[] = [];
  let run: HTMLElement[] = [];
  const resize =
    typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => measure());

  function clearRun() {
    for (const el of run) {
      el.removeAttribute("data-cover-run");
      if (!bands.includes(el)) el.style.removeProperty("--sticky-top");
    }
    run = [];
  }

  function measure() {
    const vh = window.innerHeight;
    for (const band of bands) {
      band.style.setProperty(
        "--sticky-top",
        `${stickyTop(band.offsetHeight, vh, anchorOf(band))}px`,
      );
    }
    // The run's members are pinned by app.css off this attribute, so a page
    // without JavaScript simply has none of them.
    clearRun();
    for (const { el, top } of coverRun(main, vh, (e) => e.offsetHeight)) {
      el.setAttribute("data-cover-run", "");
      el.style.setProperty("--sticky-top", `${top}px`);
      run.push(el);
    }
  }

  function collect() {
    resize?.disconnect();
    for (const band of bands) band.style.removeProperty("--sticky-top");
    clearRun();
    bands = stickyBands(main);
    // Every section is observed, not just the pinned ones: a run member's
    // height decides where the whole stack holds.
    observed = Array.from(main.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.tagName === "SECTION",
    );
    for (const el of observed) resize?.observe(el);
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
      clearRun();
      footerResize?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("resize", measureFooter);
      host?.style.removeProperty("--footer-h");
    },
  };
};
