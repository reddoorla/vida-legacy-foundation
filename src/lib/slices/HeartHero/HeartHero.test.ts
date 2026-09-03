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
    eyebrow: "Connecting Hope and Support",
    heading: [
      {
        type: "heading1",
        text: "Financial Relief and Support for Donor and Recipient Families",
        spans: [],
      },
    ],
  },
  items: [{ cta_label: "Donate now", cta_link: { link_type: "Web", url: "https://example.com" } }],
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
      // A realistic "empty" slice: Prismic returns [] for an unset rich text
      // and null for an unset key text, never undefined.
      primary: { image: {}, eyebrow: null, heading: [] },
    } as unknown as Content.HeartHeroSlice;
    const { container } = render(HeartHero, { props: { slice: bare } });
    const section = container.querySelector("[data-slice-type='heart_hero']");
    expect(section).not.toBeNull();
    // Scoped to the mask: the scroll-cue arrow is an <img> too, so a bare
    // "no images" assertion would pass for the wrong reason.
    expect(section?.querySelector(".heart-mask")).toBeNull();
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

  it("rests at the comp's heart size before any scroll", () => {
    // 46.49% is the comp's 669.436/1440. If this drifts, the hero no longer
    // opens from the composition the design specifies.
    const { container } = render(HeartHero, { props: { slice } });
    const mask = container.querySelector(".heart-mask");
    expect(mask?.getAttribute("style")).toContain("--heart-size: 46.49%");
  });

  it("puts the reveal on a sticky stage, never a fixed one", () => {
    // The regression this guards: reddoor-website's OpeningAnimation uses a
    // `fixed` full-viewport layer, which is safe only because it is a
    // page-level component used once. As a slice with siblings after it,
    // `fixed` would cover every following slice and the whole fixtures page.
    const { container } = render(HeartHero, { props: { slice } });
    const stage = container.querySelector(".heart-hero-stage");
    expect(stage).not.toBeNull();
    expect(stage?.className).not.toContain("fixed");
  });

  it("renders the eyebrow, heading and CTA from content", () => {
    const { container } = render(HeartHero, { props: { slice } });
    expect(container.textContent).toContain("Connecting Hope and Support");
    expect(container.querySelector("h1")?.textContent).toContain("Financial Relief and Support");
    const link = container.querySelector("a");
    expect(link?.textContent?.trim()).toBe("Donate now");
    expect(link?.getAttribute("href")).toBe("https://example.com");
  });

  it("keeps the copy in the DOM before it is revealed", () => {
    // The reveal is opacity/transform only — never display or visibility — so
    // the heading and links stay in the accessibility tree and the tab order
    // from the first paint, before any scrolling has happened.
    const { container } = render(HeartHero, { props: { slice } });
    const copy = container.querySelector(".hero-copy");
    expect(copy?.classList.contains("is-in")).toBe(false);
    expect(copy?.querySelector("h1")).not.toBeNull();
    expect(copy?.querySelector("a")).not.toBeNull();
  });

  it("holds the bar off the bottom edge until the calls to action are in", () => {
    // At rest the comp's hero is the full frame of green and heart; the bar
    // arrives with Variant4's buttons. The heart also sits at the comp's
    // resting height (62.7% of the free space), centring as it opens.
    const { container } = render(HeartHero, { props: { slice } });
    const bar = container.querySelector(".hero-bar");
    expect(bar?.classList.contains("is-in")).toBe(false);
    expect(container.querySelector(".heart-mask")?.getAttribute("style")).toContain(
      "--heart-y: 62.7%",
    );
  });

  it("drops a CTA that has a label but no link", () => {
    const partial = {
      ...slice,
      items: [
        { cta_label: "Donate now", cta_link: { link_type: "Web", url: "https://example.com" } },
        { cta_label: "Referral", cta_link: { link_type: "Any" } },
      ],
    } as unknown as Content.HeartHeroSlice;
    const { container } = render(HeartHero, { props: { slice: partial } });
    expect(container.querySelectorAll("a").length).toBe(1);
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
