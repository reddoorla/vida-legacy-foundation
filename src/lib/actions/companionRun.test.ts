import { describe, it, expect } from "vitest";
import { companionRun, companionSticky, runHeight } from "./companionRun";

const section = (layout?: string, className = "") => {
  const el = document.createElement("section");
  if (layout) el.dataset.layout = layout;
  el.className = className;
  return el;
};
const tall = (el: HTMLElement, height: number) => {
  Object.defineProperty(el, "offsetHeight", { value: height, configurable: true });
  return el;
};

describe("companionRun", () => {
  it("collects the float-right sections that follow, and stops at anything else", () => {
    const main = document.createElement("main");
    const intro = section();
    const boxes = section("float-right");
    const cta = section("float-right");
    const stats = section();
    const later = section("float-right");
    main.append(section("float-right"), intro, boxes, cta, stats, later);
    expect(companionRun(intro)).toEqual([boxes, cta]);
  });

  it("stops at a pinned band, which keeps its own stacking", () => {
    const main = document.createElement("main");
    const intro = section();
    const boxes = section("float-right");
    main.append(intro, boxes, section("float-right", "sticky-cover"), section("float-right"));
    expect(companionRun(intro)).toEqual([boxes]);
  });

  it("does not run into a fill band, which uses the left column", () => {
    const main = document.createElement("main");
    const intro = section();
    main.append(intro, section("fill"), section("float-right"));
    expect(companionRun(intro)).toEqual([]);
  });

  it("sums the run's measured heights", () => {
    expect(runHeight([tall(section(), 500), tall(section(), 250)])).toBe(750);
    expect(runHeight([])).toBe(0);
  });
});

describe("companionSticky action", () => {
  it("writes the run's height on the section, follows the zone, and clears on destroy", async () => {
    const main = document.createElement("main");
    document.body.append(main);
    const intro = section();
    main.append(intro, tall(section("float-right"), 900));
    const action = companionSticky(intro);
    expect(intro.style.getPropertyValue("--companion-run")).toBe("900px");
    main.append(tall(section("float-right"), 300));
    // MutationObserver callbacks are microtasks.
    await Promise.resolve();
    expect(intro.style.getPropertyValue("--companion-run")).toBe("1200px");
    action?.destroy?.();
    expect(intro.style.getPropertyValue("--companion-run")).toBe("");
    main.remove();
  });
});
