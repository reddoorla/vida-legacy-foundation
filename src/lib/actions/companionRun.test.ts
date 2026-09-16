import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

// Teardown. jsdom ships no ResizeObserver, so until this block stubbed one the
// action's entire observer half ran its `undefined` branch in every test, and
// nothing anywhere asserted that what it attached was released again (#58).
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observed: Element[] = [];
  disconnects = 0;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve(el: Element) {
    this.observed = this.observed.filter((other) => other !== el);
  }
  disconnect() {
    this.disconnects++;
    this.observed = [];
  }
  // Test helper — report a resize on what is being watched.
  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

/** The handlers passed to one of `window`'s listener methods for `type`.
 *  Spying on `window`'s own method means every call recorded here was made on
 *  `window` itself — a listener attached to any other target never appears. */
const handlersFor = (spy: { mock: { calls: unknown[][] } }, type: string) =>
  spy.mock.calls.filter((call) => call[0] === type).map((call) => call[1]);

describe("companionSticky — teardown", () => {
  let main: HTMLElement;
  let intro: HTMLElement;
  let first: HTMLElement;
  let second: HTMLElement;

  beforeEach(() => {
    FakeResizeObserver.instances = [];
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    main = document.createElement("main");
    document.body.append(main);
    intro = section();
    first = tall(section("float-right"), 900);
    second = tall(section("float-right"), 300);
    main.append(intro, first, second);
  });

  afterEach(() => {
    main.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("watches the run it measured, and releases every one of them on destroy", () => {
    const action = companionSticky(intro);
    const observer = FakeResizeObserver.instances[0];

    // Same targets: the run, not the section the action is attached to.
    expect(FakeResizeObserver.instances).toHaveLength(1);
    expect(observer.observed).toEqual([first, second]);
    const atMount = observer.disconnects;

    action?.destroy?.();

    expect(observer.disconnects).toBe(atMount + 1);
    expect(observer.observed).toEqual([]);
  });

  it("re-measures when a watched section resizes", () => {
    const action = companionSticky(intro);
    expect(intro.style.getPropertyValue("--companion-run")).toBe("1200px");

    Object.defineProperty(first, "offsetHeight", { value: 1500, configurable: true });
    FakeResizeObserver.instances[0].trigger();

    expect(intro.style.getPropertyValue("--companion-run")).toBe("1800px");
    action?.destroy?.();
  });

  it("removes the same resize handler it added, from window, and goes quiet", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");

    const action = companionSticky(intro);
    const added = handlersFor(add, "resize");
    expect(added).toHaveLength(1);

    action?.destroy?.();

    const removed = handlersFor(remove, "resize");
    expect(removed).toHaveLength(1);
    // The same function object — not merely a removal of the same event name.
    expect(removed[0]).toBe(added[0]);

    // And the proof that does not lean on the spy: a real resize after destroy
    // must not write the measurement back.
    window.dispatchEvent(new Event("resize"));
    expect(intro.style.getPropertyValue("--companion-run")).toBe("");
  });

  it("stops following the slice zone once destroyed", async () => {
    const action = companionSticky(intro);
    action?.destroy?.();

    main.append(tall(section("float-right"), 500));
    // MutationObserver callbacks are microtasks.
    await Promise.resolve();

    expect(intro.style.getPropertyValue("--companion-run")).toBe("");
  });

  it("re-points its one observer on a zone change instead of stacking another", async () => {
    second.remove();
    const action = companionSticky(intro);
    const observer = FakeResizeObserver.instances[0];
    expect(observer.observed).toEqual([first]);

    main.append(second);
    await Promise.resolve();

    // One observer for the life of the action, re-pointed — and the old
    // observation dropped, not left underneath the new one.
    expect(FakeResizeObserver.instances).toHaveLength(1);
    expect(observer.observed).toEqual([first, second]);

    action?.destroy?.();
  });
});
