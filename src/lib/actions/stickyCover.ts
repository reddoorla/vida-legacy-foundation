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
 *  screen). Whatever the stack does not fill, that photograph does — and on a
 *  screen taller than the stack the visitor sees it as a band across the top
 *  of the held screen, stopped there for as long as the panel takes to roll
 *  ("feels weird it stops at her forehead", round 4: measured at 1151px of
 *  viewport, exactly the 204px the stack was short). So the anchor band grows
 *  by that shortfall — `slack`, paid BELOW its own content (app.css turns it
 *  into padding), so the line keeps its distance from the box above it and
 *  the whole stack simply slides up until its top edge lands on the screen's.
 *  It is only ever as much as the screen needs: at the comp's own height the
 *  stack already covers and the slack is zero.
 *
 *  Each member overlaps the one below it by `STACK_OVERLAP`. The heights are
 *  fractional and the browser rounds a sticky offset, so butting the boxes
 *  edge to edge left a sub-pixel seam at every joint — a hairline of the
 *  pinned photograph showing between the bands. A pixel of overlap cannot be
 *  seen (the section below is a later sibling, so it paints over it) and no
 *  rounding can open it.
 *
 *  Heights come from `height` so a test can supply them; jsdom lays nothing
 *  out. */
export const STACK_OVERLAP = 1;

export type Cover = {
  /** The band the stack hangs from — the one before the closing panel. */
  anchor: HTMLElement | null;
  /** Where that band holds, with the slack below already paid for. */
  anchorTop: number;
  /** Height the anchor grows by, BELOW its own content, so the stack reaches
   *  the top of the screen. See the note above. */
  slack: number;
  run: { el: HTMLElement; top: number }[];
};

const EMPTY: Cover = { anchor: null, anchorTop: 0, slack: 0, run: [] };

export function coverRun(
  main: ParentNode,
  viewportHeight: number,
  height: (el: HTMLElement) => number,
): Cover {
  const sections = Array.from(main.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.tagName === "SECTION",
  );
  const panel = sections.findIndex((el) => el.matches(CLOSING));
  if (panel < 1) return EMPTY;
  const anchor = sections[panel - 1];
  const anchorTop = stickyTop(height(anchor), viewportHeight, anchorOf(anchor));
  let top = anchorTop;
  let stacked = height(anchor);
  const run: { el: HTMLElement; top: number }[] = [];
  // Whether the walk ran into a band that is pinned on its own account. That
  // is the only case where a stack short of the top shows something held
  // still behind it; run out of sections instead and what is above simply
  // scrolls, and growing the anchor would freeze a screen for no reason.
  let blocked = false;
  for (let i = panel - 2; i >= 0 && stacked < viewportHeight; i--) {
    const el = sections[i];
    if (el.classList.contains("sticky-cover")) {
      blocked = true;
      break;
    }
    top -= height(el) - STACK_OVERLAP;
    stacked += height(el);
    run.unshift({ el, top });
  }
  // `top` is now the stack's own top edge. Left above zero with a pinned band
  // behind it, that is a strip of the photograph across the top of the held
  // screen — only possible under a bottom anchor, since a top one is already
  // clamped to 0.
  const slack = blocked && anchorOf(anchor) === "bottom" ? Math.max(0, top) : 0;
  return {
    anchor,
    anchorTop: anchorTop - slack,
    slack,
    run: slack ? run.map((r) => ({ ...r, top: r.top - slack })) : run,
  };
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
  // The slack this action is currently paying for, and on which band — read
  // back out of the measurement below, or each pass would see the height it
  // just wrote, find nothing missing, take the slack away and start over.
  let slackEl: HTMLElement | null = null;
  let slackPx = 0;
  const resize =
    typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => measure());

  function clearRun() {
    for (const el of run) {
      el.removeAttribute("data-cover-run");
      if (!bands.includes(el)) el.style.removeProperty("--sticky-top");
    }
    run = [];
  }

  function clearSlack() {
    slackEl?.style.removeProperty("--cover-slack");
    slackEl = null;
    slackPx = 0;
  }

  // The band's own height, fractional and without the slack: offsetHeight
  // rounds to whole pixels, and a stack built from rounded heights leaves a
  // sub-pixel seam at every joint for the page behind to show through. Falls
  // back to offsetHeight where there is no layout at all (jsdom, where every
  // rect is 0).
  const height = (el: HTMLElement) =>
    (el.getBoundingClientRect().height || el.offsetHeight) - (el === slackEl ? slackPx : 0);

  function measure() {
    const vh = window.innerHeight;
    const cover = coverRun(main, vh, height);
    if (slackEl && slackEl !== cover.anchor) clearSlack();
    if (cover.anchor && cover.slack) {
      slackEl = cover.anchor;
      slackPx = cover.slack;
      cover.anchor.style.setProperty("--cover-slack", `${cover.slack}px`);
    } else if (slackEl) {
      clearSlack();
    }
    for (const band of bands) {
      const top =
        band === cover.anchor ? cover.anchorTop : stickyTop(height(band), vh, anchorOf(band));
      band.style.setProperty("--sticky-top", `${top}px`);
    }
    // The run's members are pinned by app.css off this attribute, so a page
    // without JavaScript simply has none of them.
    clearRun();
    for (const { el, top } of cover.run) {
      el.setAttribute("data-cover-run", "");
      el.style.setProperty("--sticky-top", `${top}px`);
      run.push(el);
    }
  }

  function collect() {
    resize?.disconnect();
    for (const band of bands) band.style.removeProperty("--sticky-top");
    clearRun();
    clearSlack();
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
      clearSlack();
      footerResize?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("resize", measureFooter);
      host?.style.removeProperty("--footer-h");
    },
  };
};
