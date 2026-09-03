import { render } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
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
