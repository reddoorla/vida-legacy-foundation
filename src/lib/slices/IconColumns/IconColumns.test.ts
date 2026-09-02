import { render } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import type { Content } from "@prismicio/client";
import IconColumns from "./index.svelte";

const icon = (url: string) => ({ url, alt: "", dimensions: { width: 133, height: 133 } });

const slice = {
  slice_type: "icon_columns",
  variation: "default",
  primary: {
    eyebrow: "A companion on the journey",
    body: [{ type: "paragraph", text: "Vida Legacy Foundation leads the way.", spans: [] }],
    image: {
      url: "https://img.example/feature.jpg",
      alt: "A child in a hospital bed",
      dimensions: { width: 1280, height: 853 },
    },
  },
  items: [
    {
      icon: icon("/icons/relief.svg"),
      title: "Grants for recovery",
      description: "Families find relief.",
    },
    {
      icon: icon("/icons/brain.svg"),
      title: "Access to education",
      description: "We equip families.",
    },
    {
      icon: icon("/icons/community.svg"),
      title: "Compassionate support",
      description: "We provide support.",
    },
  ],
} as unknown as Content.IconColumnsSlice;

// Queries are scoped to `container`, never the document: this suite has no
// auto-cleanup between renders, so an unscoped getBy* sees every earlier test's
// DOM too and fails on duplicates.
describe("IconColumns slice", () => {
  it("sets slice data attributes", () => {
    const { container } = render(IconColumns, { props: { slice } });
    const section = container.querySelector("[data-slice-type='icon_columns']");
    expect(section?.getAttribute("data-slice-variation")).toBe("default");
  });

  it("renders the eyebrow as the section heading and every column", () => {
    const { container } = render(IconColumns, { props: { slice } });
    expect(container.querySelector("h2")?.textContent?.trim()).toBe("A companion on the journey");
    expect(container.textContent).toContain("Grants for recovery");
    expect(container.textContent).toContain("Access to education");
    expect(container.textContent).toContain("Compassionate support");
  });

  it("renders icons decoratively", () => {
    // The icon repeats the title it sits above, so exposing it to a screen
    // reader would just duplicate the label.
    const { container } = render(IconColumns, { props: { slice } });
    const icons = container.querySelectorAll(".icon-card img");
    expect(icons.length).toBe(3);
    icons.forEach((i) => {
      expect(i.getAttribute("alt")).toBe("");
      expect(i.getAttribute("aria-hidden")).toBe("true");
    });
  });

  it("renders icons with a plain <img>, not an imgix srcset", () => {
    // The regression this guards: switching these to <PrismicImage> would send
    // flat SVG glyphs through asImageWidthSrcSet, which calls new URL() and
    // throws "Invalid URL" on the relative paths the mocks and fixtures use —
    // 500ing the prerender.
    const { container } = render(IconColumns, { props: { slice } });
    const first = container.querySelector(".icon-card img");
    expect(first?.getAttribute("src")).toBe("/icons/relief.svg");
    expect(first?.hasAttribute("srcset")).toBe(false);
  });

  it("drops columns that carry neither a title nor a description", () => {
    const sparse = {
      ...slice,
      items: [
        { icon: icon("/icons/relief.svg"), title: "Kept", description: "" },
        { icon: icon("/icons/brain.svg"), title: "", description: "" },
      ],
    } as unknown as Content.IconColumnsSlice;
    const { container } = render(IconColumns, { props: { slice: sparse } });
    expect(container.querySelectorAll(".icon-card img").length).toBe(1);
  });

  it("renders without the optional photo", () => {
    const noPhoto = {
      ...slice,
      primary: { ...slice.primary, image: {} },
    } as unknown as Content.IconColumnsSlice;
    const { container } = render(IconColumns, { props: { slice: noPhoto } });
    expect(container.querySelector("[data-slice-type='icon_columns']")).not.toBeNull();
    // Only the three decorative icons remain — no feature photo.
    expect(container.querySelectorAll("img").length).toBe(3);
  });
});
