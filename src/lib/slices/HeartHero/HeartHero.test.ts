import { render } from "@testing-library/svelte";
import { describe, it, expect, afterEach } from "vitest";
import { tick } from "svelte";
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

  it("clips the scrim to the heart so only the photograph is darkened", () => {
    // Nicole, 2026-09-07: "could the dark overlay on the homepage masthead
    // only apply to the image, not the green cutout?" A sibling scrim covers
    // the whole stage, so at rest — heart at 46.49% — it dulled the green
    // ground. Nesting it inside the masked element is the whole mechanism:
    // the mask applies to children too, so the scrim inherits the heart's
    // exact size and position in every frame with no second set of mask
    // rules to keep in step (and nothing to add to app.html's noscript
    // block). Assert the containment, not the CSS.
    const { container } = render(HeartHero, { props: { slice } });
    const mask = container.querySelector(".heart-mask");
    const scrim = container.querySelector(".hero-scrim");
    expect(mask).not.toBeNull();
    expect(scrim).not.toBeNull();
    expect(mask?.contains(scrim!)).toBe(true);
    // And it still paints over the photo, not under it: same stacking
    // context, and the last child, so every earlier sibling — the photo —
    // paints first.
    expect(mask?.querySelector("img")).not.toBeNull();
    expect(mask?.lastElementChild).toBe(scrim);
  });

  it("keeps a full-bleed scrim when there is no photo to clip it to", () => {
    // Without an image there is no heart, and the copy would sit on bare
    // --color-green: cream on it is 1.94, and this design ships no
    // white-on-green anywhere. The unmasked scrim is what carries the bottom
    // of the band back to ~4.5, so losing it in the else branch would be a
    // silent contrast regression axe cannot see (it renders no text over the
    // green in the fixtures).
    const bare = {
      ...slice,
      primary: { image: {}, eyebrow: null, heading: [] },
    } as unknown as Content.HeartHeroSlice;
    const { container } = render(HeartHero, { props: { slice: bare } });
    const scrim = container.querySelector(".hero-scrim");
    expect(scrim).not.toBeNull();
    expect(scrim?.parentElement?.className).toContain("heart-hero-stage");
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

describe("HeartHero's moving hero", () => {
  const withVideo = {
    ...slice,
    primary: { ...slice.primary, vimeo_id: "1226003530" },
  } as unknown as Content.HeartHeroSlice;

  // Answer each media query independently: the slice asks two — reduced motion
  // and the width threshold — and the whole point of the gate is that they are
  // separate answers. Asserting on the VimeoBackground wrapper rather than on
  // an iframe is deliberate: the embed itself waits for a real interaction, and
  // that mechanism is VimeoBackground's to test, not this slice's.
  const media = (answers: { reduce?: boolean; wide?: boolean }) => {
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion") ? !!answers.reduce : !!answers.wide,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
  };

  const realMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  const bg = (container: HTMLElement) => container.querySelector(".vimeo-bg");

  it("mounts the player on a wide client that allows motion", async () => {
    media({ wide: true, reduce: false });
    const { container } = render(HeartHero, { props: { slice: withVideo } });
    await tick();
    expect(bg(container)).not.toBeNull();
  });

  it("mounts no player under reduced motion — not a hidden one, none", async () => {
    media({ wide: true, reduce: true });
    const { container } = render(HeartHero, { props: { slice: withVideo } });
    await tick();
    expect(bg(container)).toBeNull();
  });

  it("mounts no player on a phone, which gets the face-aware crop instead", async () => {
    media({ wide: false, reduce: false });
    const { container } = render(HeartHero, { props: { slice: withVideo } });
    await tick();
    expect(bg(container)).toBeNull();
  });

  it("mounts no player when the slice carries only an image", async () => {
    media({ wide: true, reduce: false });
    const { container } = render(HeartHero, { props: { slice } });
    await tick();
    expect(bg(container)).toBeNull();
  });

  it("treats a blank vimeo id as no id at all", async () => {
    // Prismic returns "" for a text field an editor opened and left empty, and
    // a stray space is one keystroke away from shipping an iframe pointed at
    // https://player.vimeo.com/video/ .
    media({ wide: true, reduce: false });
    const blank = {
      ...slice,
      primary: { ...slice.primary, vimeo_id: "   " },
    } as unknown as Content.HeartHeroSlice;
    const { container } = render(HeartHero, { props: { slice: blank } });
    await tick();
    expect(bg(container)).toBeNull();
  });

  it("keeps the photograph underneath, so the clip is never the only source", async () => {
    media({ wide: true, reduce: false });
    const { container } = render(HeartHero, { props: { slice: withVideo } });
    await tick();
    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("A patient smiling with a family member");
  });

  it("puts the player under the scrim, so it is darkened on the photograph's terms", async () => {
    media({ wide: true, reduce: false });
    const { container } = render(HeartHero, { props: { slice: withVideo } });
    await tick();
    const mask = container.querySelector(".heart-mask")!;
    const kids = [...mask.children];
    const video = kids.findIndex((el) => el.classList.contains("vimeo-bg"));
    const scrim = kids.findIndex((el) => el.classList.contains("hero-scrim"));
    expect(video).toBeGreaterThanOrEqual(0);
    expect(scrim).toBeGreaterThan(video);
  });

  it("keeps the player inside the heart mask, which is what clips it", async () => {
    media({ wide: true, reduce: false });
    const { container } = render(HeartHero, { props: { slice: withVideo } });
    await tick();
    expect(container.querySelector(".heart-mask")!.contains(bg(container)!)).toBe(true);
  });
});
