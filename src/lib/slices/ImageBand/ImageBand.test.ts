import { render } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import type { Content } from "@prismicio/client";
import ImageBand from "./index.svelte";

const slice = {
  slice_type: "image_band",
  variation: "default",
  primary: {
    image: {
      url: "https://img.example/band.jpg",
      alt: "A daughter embracing her mother at home",
      dimensions: { width: 1440, height: 860 },
    },
  },
  items: [],
} as unknown as Content.ImageBandSlice;

// Queries are scoped to `container`, never the document: this suite has no
// auto-cleanup between renders, so an unscoped getBy* sees every earlier test's
// DOM too and fails on duplicates.
describe("ImageBand slice", () => {
  it("sets slice data attributes", () => {
    const { container } = render(ImageBand, { props: { slice } });
    const section = container.querySelector("[data-slice-type='image_band']");
    expect(section?.getAttribute("data-slice-variation")).toBe("default");
  });

  it("carries the authored alt text through", () => {
    const { container } = render(ImageBand, { props: { slice } });
    expect(container.querySelector("img")?.getAttribute("alt")).toBe(
      "A daughter embracing her mother at home",
    );
  });

  it("never preloads", () => {
    // HeroBackgroundImage injects a fetchpriority=high <link rel=preload> when
    // preloading, and exactly ONE above-the-fold image per page should — on the
    // homepage that is HeartHero. These are mid-page; preloading them would put
    // two more images in contention with the real LCP.
    render(ImageBand, { props: { slice } });
    const preloads = document.head.querySelectorAll("link[rel='preload'][as='image']");
    expect(preloads.length).toBe(0);
  });

  it("renders nothing at all when no image is authored", () => {
    // An empty band would otherwise reserve a 1440/860 box of blank page.
    const empty = { ...slice, primary: { image: {} } } as unknown as Content.ImageBandSlice;
    const { container } = render(ImageBand, { props: { slice: empty } });
    expect(container.querySelector("[data-slice-type='image_band']")).toBeNull();
  });

  it("asks to be cleared completely by the band that slides over it", () => {
    // app.css gives the section after a `.sticky-cover--clear` band a viewport
    // of minimum height. Without it the 318px navy band could only cover 318px
    // of the photograph per screen, so it stayed as a strip across the top
    // while the section after it was already up — "feels weird it stops at her
    // forehead" (client review, round 4).
    const { container } = render(ImageBand, { props: { slice } });
    const section = container.querySelector("[data-slice-type='image_band']");
    expect(section?.className).toContain("sticky-cover--clear");
  });

  it("holds the comps' 1440x860 box", () => {
    const { container } = render(ImageBand, { props: { slice } });
    const section = container.querySelector("[data-slice-type='image_band']");
    expect(section?.className).toContain("aspect-1440/860");
    // The crop gives on a narrow screen, not the height.
    expect(container.querySelector("img")?.className).toContain("object-cover");
  });
});
