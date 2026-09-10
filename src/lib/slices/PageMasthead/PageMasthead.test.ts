import { render, cleanup } from "@testing-library/svelte";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Content } from "@prismicio/client";
import PageMasthead from "./index.svelte";

const make = (primary: Record<string, unknown> = {}) =>
  ({
    slice_type: "page_masthead",
    variation: "default",
    primary: {
      image: {
        url: "https://img.example/masthead.jpg",
        alt: "Two men embracing",
        dimensions: { width: 1280, height: 390 },
      },
      eyebrow: "About us",
      title: "Who We Are",
      ...primary,
    },
    items: [],
  }) as unknown as Content.PageMastheadSlice;

// Queries are scoped to `container`, never the document: this suite has no
// auto-cleanup between renders, so an unscoped getBy* sees every earlier test's
// DOM too and fails on duplicates.
describe("PageMasthead slice", () => {
  it("sets slice data attributes", () => {
    const { container } = render(PageMasthead, { props: { slice: make() } });
    const section = container.querySelector("[data-slice-type='page_masthead']");
    expect(section?.getAttribute("data-slice-variation")).toBe("default");
  });

  it("renders the title as the page h1", () => {
    // The [uid] route renders ONLY the slice zone, so nothing else on an
    // interior page can supply an h1 — this slice owns it.
    const { container } = render(PageMasthead, { props: { slice: make() } });
    expect(container.querySelector("h1")?.textContent?.trim()).toBe("Who We Are");
  });

  it("keeps the eyebrow out of the outline", () => {
    const { container } = render(PageMasthead, { props: { slice: make() } });
    expect(container.querySelectorAll("h1, h2, h3, h4, h5, h6").length).toBe(1);
    expect(container.textContent).toContain("About us");
  });

  it("renders photo-only when no copy is authored, as the comp ships it", () => {
    // The comp's copy block is opacity-0; the fields exist so a page CAN have
    // an h1, not because this masthead shows one.
    const { container } = render(PageMasthead, {
      props: { slice: make({ eyebrow: "", title: "" }) },
    });
    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("starts closed in the comp's window, on a sticky stage, with the copy held back", () => {
    // The photograph opens from the comp's 1280x390 window under the bar to
    // the full viewport as the runway scrolls — HeartHero's mechanics in this
    // page's shape. Before any scroll the window is shut and the copy is in
    // the DOM but not yet shown (opacity/transform only, never display).
    const { container } = render(PageMasthead, { props: { slice: make() } });
    const stage = container.querySelector(".page-masthead-stage");
    expect(stage?.getAttribute("style")).toContain("--opened: 0");
    expect(stage?.className).not.toContain("fixed");
    expect(container.querySelector(".masthead-window")).not.toBeNull();
    const copy = container.querySelector(".masthead-copy");
    expect(copy?.classList.contains("is-in")).toBe(false);
    expect(copy?.querySelector("h1")).not.toBeNull();
  });

  it("preloads its image, unlike the mid-page bands", () => {
    // This one IS the above-the-fold image on its page, so it is the one that
    // should carry the fetchpriority=high preload (ImageBand deliberately does
    // not — see its test).
    //
    // Counted as a DELTA, not an absolute: this suite has no cleanup between
    // renders, so <svelte:head> links from every earlier test are still in
    // document.head and an absolute count just measures test order.
    const sel = "link[rel='preload'][as='image']";
    const before = document.head.querySelectorAll(sel).length;
    render(PageMasthead, { props: { slice: make() } });
    const added = [...document.head.querySelectorAll(sel)].slice(before);
    expect(added.length).toBe(1);
    expect(added[0].getAttribute("fetchpriority")).toBe("high");
  });

  it("survives an unauthored image", () => {
    const { container } = render(PageMasthead, { props: { slice: make({ image: {} }) } });
    expect(container.querySelector("[data-slice-type='page_masthead']")).not.toBeNull();
    expect(container.querySelector("h1")?.textContent?.trim()).toBe("Who We Are");
  });
});

describe("PageMasthead opening itself", () => {
  // Nicole, on Discord (2026-09-09): "could the about page open automatically
  // as well?" — the same request that gave the home hero its opening a week
  // earlier, for the band that opens /about and /donate. The mechanism is
  // shared and tested in $lib/utils/autoOpen; what belongs here is that this
  // slice is wired to it, far enough through the runway to bring the copy in.
  const VIEWPORT = 800;
  const RUNWAY = 2400 - VIEWPORT;
  let scrolled: number[] = [];
  let realRect: typeof Element.prototype.getBoundingClientRect;

  beforeEach(() => {
    vi.useFakeTimers();
    scrolled = [];
    sessionStorage.clear();
    // jsdom lays nothing out, so the band has to be given a runway.
    realRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = () =>
      ({
        top: 0,
        height: 2400,
        bottom: 2400,
        left: 0,
        right: 0,
        width: 1280,
        x: 0,
        y: 0,
      }) as DOMRect;
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "innerHeight", {
      value: VIEWPORT,
      writable: true,
      configurable: true,
    });
    window.scrollTo = ((_x: number, y: number) => {
      scrolled.push(y);
      Object.defineProperty(window, "scrollY", { value: y, writable: true, configurable: true });
    }) as typeof window.scrollTo;
  });

  afterEach(() => {
    Element.prototype.getBoundingClientRect = realRect;
    vi.useRealTimers();
    cleanup();
  });

  it("scrolls its own runway far enough to bring the copy in", async () => {
    render(PageMasthead, { props: { slice: make() } });
    await vi.advanceTimersByTimeAsync(2000 + 3000);
    expect(scrolled.length, "the masthead never opened itself").toBeGreaterThan(0);
    // The copy is revealed at 0.6 of the runway, so it has to finish past it.
    expect(scrolled.at(-1)).toBeGreaterThan(RUNWAY * 0.6);
  });

  it("leaves a reduced-motion visitor where they are, already on the open frame", async () => {
    const real = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      render(PageMasthead, { props: { slice: make() } });
      await vi.advanceTimersByTimeAsync(2000 + 3000);
      expect(scrolled).toEqual([]);
    } finally {
      window.matchMedia = real;
    }
  });
});
