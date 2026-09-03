import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { stickyBands, stickyTop, stickyCovers, footerAfter, anchorOf } from "./stickyCover";

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

  it("rests a bottom-anchored band on the bottom edge whatever its height", () => {
    // The homepage's closing statement: 303px of comp height in a 900px
    // viewport comes to rest 597px down, its bottom on the viewport's.
    expect(stickyTop(303, 900, "bottom")).toBe(597);
    // A tall one is unchanged — the top anchor already held it that way.
    expect(stickyTop(1098, 900, "bottom")).toBe(-198);
  });

  it("reads the anchor off the band", () => {
    expect(anchorOf(section("lead_text", "statement"))).toBe("top");
    expect(anchorOf(section("lead_text", "statement", "sticky-cover sticky-cover--bottom"))).toBe(
      "bottom",
    );
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

  it("rests a bottom-anchored band on the viewport's bottom edge", () => {
    const band = section("lead_text", "statement", "sticky-cover sticky-cover--bottom");
    Object.defineProperty(band, "offsetHeight", { value: 300, configurable: true });
    main.append(band, section("cta_banner", "onCream"));
    const action = stickyCovers(main);
    expect(band.style.getPropertyValue("--sticky-top")).toBe("600px");
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

  it("reserves the footer's height on the shared parent, so a band holds through it", () => {
    // <main> grows by it (::after) and the footer is pulled up over the
    // spacer (app.css): the pinned band is released at the footer's bottom
    // edge, not <main>'s.
    const footer = document.createElement("footer");
    Object.defineProperty(footer, "offsetHeight", { value: 320, configurable: true });
    main.after(footer);
    expect(footerAfter(main)).toBe(footer);
    const action = stickyCovers(main);
    expect(document.body.style.getPropertyValue("--footer-h")).toBe("320px");
    action?.destroy?.();
    expect(document.body.style.getPropertyValue("--footer-h")).toBe("");
    footer.remove();
  });

  it("reserves nothing when nothing follows <main>", () => {
    expect(footerAfter(main)).toBeNull();
    const action = stickyCovers(main);
    expect(document.body.style.getPropertyValue("--footer-h")).toBe("");
    action?.destroy?.();
  });
});
