import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  stickyBands,
  stickyTop,
  stickyCovers,
  footerAfter,
  anchorOf,
  coverRun,
} from "./stickyCover";

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

describe("coverRun", () => {
  const main = (heights: Record<string, number>, els: HTMLElement[]) => {
    const m = document.createElement("main");
    m.append(...els);
    return [m, (el: HTMLElement) => heights[el.dataset.sliceType!] ?? 0] as const;
  };

  it("stacks the sections the panel rolls over until they fill the viewport", () => {
    // The homepage: the closing statement rests at the bottom, and the two
    // navy sections above it hold against it rather than scrolling behind.
    const cta = section("cta_banner", "onDark");
    const stats = section("stats_band");
    const statement = section("lead_text", "statement", "sticky-cover sticky-cover--bottom");
    const [m, h] = main({ cta_banner: 400, stats_band: 330, lead_text: 300 }, [
      section("image_band", "default", "sticky-cover"),
      cta,
      stats,
      statement,
      section("cta_banner", "onCream"),
    ]);
    // The statement rests at 900 - 300 = 600; stats holds its bottom against
    // that (600 - 330), and the CTA against stats (271 - 400) — each a pixel
    // lower than flush, so no rounding can open a seam between them. The
    // stack clears the top of the screen on its own, so it grows by nothing.
    const cover = coverRun(m, 900, h);
    expect(cover.slack).toBe(0);
    expect(cover.anchor).toBe(statement);
    expect(cover.anchorTop).toBe(600);
    expect(cover.run).toEqual([
      { el: cta, top: -128 },
      { el: stats, top: 271 },
    ]);
  });

  it("grows the anchor below its line by exactly what the screen is short", () => {
    // Nicole's screen, round 4: 1151px of viewport against a stack of
    // 300 + 330 + 400 (less two pixels of overlap) left the pinned
    // photograph as a band across the top of the held screen. The statement
    // takes the difference as height BELOW its own line, and the whole stack
    // slides up until its top edge lands on the screen's.
    const cta = section("cta_banner", "onDark");
    const stats = section("stats_band");
    const statement = section("lead_text", "statement", "sticky-cover sticky-cover--bottom");
    const [m, h] = main({ cta_banner: 400, stats_band: 330, lead_text: 300 }, [
      section("image_band", "default", "sticky-cover"),
      cta,
      stats,
      statement,
      section("cta_banner", "onCream"),
    ]);
    const cover = coverRun(m, 1151, h);
    expect(cover.slack).toBe(123);
    expect(cover.anchor).toBe(statement);
    // 1151 - 300 - 123: the band still ends on the bottom of the screen.
    expect(cover.anchorTop).toBe(728);
    expect(cover.anchorTop + 300 + cover.slack).toBe(1151);
    // And the top of the stack is now the top of the screen.
    expect(cover.run[0]?.top).toBe(0);
    expect(cover.run.map((r) => r.el)).toEqual([cta, stats]);
  });

  it("never grows a band that holds by its top edge", () => {
    // Who We Are's board section: a top anchor is already clamped to 0, so
    // the stack cannot come up short and there is nothing to pay for.
    const board = section("person_grid", "default", "sticky-cover");
    const [m, h] = main({ person_grid: 400, statement_panel: 200 }, [
      section("statement_panel"),
      board,
      section("cta_banner", "onCream"),
    ]);
    const cover = coverRun(m, 1400, h);
    expect(cover.slack).toBe(0);
    expect(cover.anchorTop).toBe(0);
  });

  it("stops at a band that is already holding on its own", () => {
    const photo = section("image_band", "default", "sticky-cover");
    const stats = section("stats_band");
    const statement = section("lead_text", "statement", "sticky-cover sticky-cover--bottom");
    const [m, h] = main({ image_band: 900, stats_band: 100, lead_text: 100 }, [
      photo,
      stats,
      statement,
      section("cta_banner", "onCream"),
    ]);
    // 200px of stack in a 900px viewport, and the photograph above it is
    // pinned already — it is not taken into the run; the statement grows by
    // the 701 the stack is short instead.
    const cover = coverRun(m, 900, h);
    expect(cover.run.map((r) => r.el)).toEqual([stats]);
    expect(cover.slack).toBe(701);
    expect(cover.run[0]?.top).toBe(0);
  });

  it("adds nothing when the band before the panel already fills the screen", () => {
    const board = section("person_grid");
    const [m, h] = main({ person_grid: 1100, statement_panel: 300 }, [
      section("statement_panel"),
      board,
      section("cta_banner", "onCream"),
    ]);
    const cover = coverRun(m, 900, h);
    expect(cover.run).toEqual([]);
    expect(cover.slack).toBe(0);
  });

  it("is empty on a page with no closing panel", () => {
    const [m, h] = main({ donation_form: 800 }, [section("donation_form")]);
    expect(coverRun(m, 900, h)).toEqual({ anchor: null, anchorTop: 0, slack: 0, run: [] });
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

  it("pays the shortfall as height below the anchor's line, and takes it back", () => {
    // Nicole's 1151px screen: 300 + 330 of stack under a pinned photograph
    // left 523 of it showing across the top of the held screen.
    Object.defineProperty(window, "innerHeight", { value: 1151, configurable: true });
    const photo = section("image_band", "default", "sticky-cover");
    const stats = section("stats_band");
    const statement = section("lead_text", "statement", "sticky-cover sticky-cover--bottom");
    for (const [el, h] of [
      [photo, 851],
      [stats, 330],
      [statement, 300],
    ] as const)
      Object.defineProperty(el, "offsetHeight", { value: h, configurable: true });
    main.append(photo, stats, statement, section("cta_banner", "onCream"));
    const action = stickyCovers(main);
    expect(statement.style.getPropertyValue("--cover-slack")).toBe("522px");
    // The band still ends on the bottom of the screen: 329 + 300 + 522.
    expect(statement.style.getPropertyValue("--sticky-top")).toBe("329px");
    // And the stats card above it now starts at the top of it.
    expect(stats.style.getPropertyValue("--sticky-top")).toBe("0px");
    // A second pass must read the band's own height back, not the grown one,
    // or the slack it just paid would look like height it does not need.
    Object.defineProperty(statement, "offsetHeight", { value: 822, configurable: true });
    window.dispatchEvent(new Event("resize"));
    expect(statement.style.getPropertyValue("--cover-slack")).toBe("522px");
    action?.destroy?.();
    expect(statement.style.getPropertyValue("--cover-slack")).toBe("");
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
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
