/** Holds the IconColumns intro column for the length of the slices after it.
 *
 *  "A companion on the journey" is a sticky column, and a sticky box is
 *  released at the end of its containing block — its own section. The comp
 *  wants it to stay put beside the boxes in the NEXT slice, which floats
 *  right and leaves the left column empty. So the section is made to reach:
 *  a spacer row in its grid grows by the run's height and a negative bottom
 *  margin pulls the run back up over the spacer (the slice's own styles),
 *  and the intro's grid area — its sticky range — spans both rows, above the
 *  run in stacking order.
 *
 *  The run is the consecutive following sections marked
 *  data-layout="float-right" (the `layout` field's default on LeadText,
 *  SectionGrid and CtaBanner, written by ContentBand), stopping at a pinned
 *  band, which keeps its own stacking. Its height is content, so it is
 *  measured: on each run section's resize, on window resize, and when the
 *  slice zone's children change. Attach to the IconColumns section. */
import type { Action } from "svelte/action";

export function companionRun(section: Element): HTMLElement[] {
  const run: HTMLElement[] = [];
  let next = section.nextElementSibling;
  while (
    next instanceof HTMLElement &&
    next.tagName === "SECTION" &&
    next.dataset.layout === "float-right" &&
    !next.classList.contains("sticky-cover")
  ) {
    run.push(next);
    next = next.nextElementSibling;
  }
  return run;
}

export function runHeight(run: readonly HTMLElement[]): number {
  return run.reduce((sum, el) => sum + el.offsetHeight, 0);
}

export const companionSticky: Action<HTMLElement> = (section) => {
  let run: HTMLElement[] = [];
  const resize =
    typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => measure());

  function measure() {
    section.style.setProperty("--companion-run", `${runHeight(run)}px`);
  }

  function collect() {
    resize?.disconnect();
    run = companionRun(section);
    for (const el of run) resize?.observe(el);
    measure();
  }

  const parent = section.parentElement;
  const siblings = parent ? new MutationObserver(collect) : undefined;
  if (parent) siblings?.observe(parent, { childList: true });
  window.addEventListener("resize", measure);
  collect();

  return {
    destroy() {
      siblings?.disconnect();
      resize?.disconnect();
      window.removeEventListener("resize", measure);
      section.style.removeProperty("--companion-run");
    },
  };
};
