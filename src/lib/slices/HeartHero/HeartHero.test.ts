import { render } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import type { Content } from "@prismicio/client";
import HeartHero from "./index.svelte";
import { TEXTURE_LQIP } from "./texture-lqip";

const slice = {
  slice_type: "heart_hero",
  variation: "default",
  primary: {
    image: {
      url: "https://img.example/hero.jpg",
      alt: "A patient smiling with a family member",
      dimensions: { width: 1600, height: 1067 },
    },
  },
  items: [],
} as unknown as Content.HeartHeroSlice;

describe("HeartHero slice", () => {
  it("sets slice data attributes", () => {
    const { container } = render(HeartHero, { props: { slice } });
    const section = container.querySelector("[data-slice-type='heart_hero']");
    expect(section?.getAttribute("data-slice-variation")).toBe("default");
  });

  // NB: queries are scoped to `container`, never the document. This suite has
  // no auto-cleanup between renders, so an unscoped getBy* sees every earlier
  // test's DOM too and fails on duplicates.
  it("renders the photo with its alt text", () => {
    const { container } = render(HeartHero, { props: { slice } });
    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("A patient smiling with a family member");
  });

  it("renders the green ground but no photo when the image is empty", () => {
    const bare = {
      ...slice,
      primary: { image: {} },
    } as unknown as Content.HeartHeroSlice;
    const { container } = render(HeartHero, { props: { slice: bare } });
    const section = container.querySelector("[data-slice-type='heart_hero']");
    expect(section).not.toBeNull();
    expect(section?.querySelector("img")).toBeNull();
    // The grain still renders — it belongs to the ground, not the photo.
    expect(section?.querySelector(".texture-full")).not.toBeNull();
  });

  it("paints the inlined LQIP grain immediately, with the full file layered over it", () => {
    // The regression this guards: dropping the LQIP would leave the hero flat
    // green until a 54KB request lands, which is the exact flash the two-tier
    // texture exists to prevent.
    const { container } = render(HeartHero, { props: { slice } });
    const layers = container.querySelectorAll("[aria-hidden='true'] > div");
    expect(layers.length).toBe(2);
    expect(layers[0].getAttribute("style")).toContain(TEXTURE_LQIP);
    expect(layers[1].getAttribute("style")).toContain("/texture-grain.webp");
  });

  it("keeps the grain decorative and non-interactive", () => {
    const { container } = render(HeartHero, { props: { slice } });
    const grain = container.querySelector("[aria-hidden='true']");
    expect(grain?.className).toContain("pointer-events-none");
  });

  it("starts the full-resolution grain hidden so it can only fade in", () => {
    // is-ready is applied by the $effect once the image decodes; without it the
    // upgrade layer must not be visible, or there is nothing to cross-fade.
    const { container } = render(HeartHero, { props: { slice } });
    const full = container.querySelector(".texture-full");
    expect(full?.classList.contains("is-ready")).toBe(false);
  });
});
