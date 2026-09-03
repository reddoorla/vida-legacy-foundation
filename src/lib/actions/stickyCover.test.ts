import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { stickyBands, stickyTop, stickyCovers } from "./stickyCover";

const section = (type: string, variation = "default", cls = "") => {
  const el = document.createElement("section");
  el.dataset.sliceType = type;
  el.dataset.sliceVariation = variation;
  if (cls) el.className = cls;
  return el;
};

describe("stickyTop", () => {
  it("pins a short band at the top of the viewport", () => {
    expect(stickyTop(300, 900)).toBe(0);
  });

  it("pins a tall band by its bottom edge instead of hiding its lower half", () => {
    // 1098px board section in a 900px viewport: hold it 198px above the top,
    // so its bottom sits at the bottom of the viewport.
    expect(stickyTop(1098, 900)).toBe(-198);
  });
});

describe("stickyBands", () => {
  it("picks marked bands and the band before the closing cream panel", () => {
    const main = document.createElement("main");
    const hero = section("heart_hero");
    const lead = section("lead_text", "onDark", "sticky-cover");
    const grid = section("section_grid", "onDark");
    const statement = section("lead_text", "statement");
    const closing = section("cta_banner", "onCream");
    const quote = section("testimonial", "onCream");
    main.append(hero, lead, grid, statement, closing, quote);
    expect(stickyBands(main)).toEqual([lead, statement]);
  });

  it("ignores non-section children", () => {
    const main = document.createElement("main");
    const div = document.createElement("div");
    div.className = "sticky-cover";
    main.append(div, section("cta_banner", "onCream"));
    expect(stickyBands(main)).toEqual([]);
  });
});

describe("stickyCovers action", () => {
  let main: HTMLElement;
  beforeEach(() => {
    main = document.createElement("main");
    document.body.append(main);
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
  });
  afterEach(() => main.remove());

  it("writes each pinned band's offset from its measured height", () => {
    const band = section("lead_text", "statement");
    Object.defineProperty(band, "offsetHeight", { value: 1100, configurable: true });
    main.append(band, section("cta_banner", "onCream"));
    const action = stickyCovers(main);
    expect(band.style.getPropertyValue("--sticky-top")).toBe("-200px");
    action?.destroy?.();
  });

  it("re-collects when the slice zone changes", async () => {
    const action = stickyCovers(main);
    const band = section("image_band", "default", "sticky-cover");
    Object.defineProperty(band, "offsetHeight", { value: 500, configurable: true });
    main.append(band);
    // MutationObserver callbacks are microtasks.
    await Promise.resolve();
    expect(band.style.getPropertyValue("--sticky-top")).toBe("0px");
    action?.destroy?.();
  });
});
