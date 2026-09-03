import { render } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import type { Content } from "@prismicio/client";
import SectionGrid from "./index.svelte";

const slice = {
  slice_type: "section_grid",
  variation: "default",
  primary: {
    heading: [{ type: "heading2", text: "Features", spans: [] }],
    columns: 3,
  },
  items: [
    {
      item_heading: [{ type: "heading3", text: "Pool", spans: [] }],
      item_body: [{ type: "paragraph", text: "Heated.", spans: [] }],
      item_media: {
        url: "https://img.example/a.jpg",
        alt: "Pool",
        dimensions: { width: 800, height: 600 },
      },
      item_link: { link_type: "Any" },
    },
    {
      item_heading: [{ type: "heading3", text: "Gym", spans: [] }],
      item_body: [{ type: "paragraph", text: "24/7.", spans: [] }],
      item_media: {
        url: "https://img.example/b.jpg",
        alt: "Gym",
        dimensions: { width: 800, height: 600 },
      },
      item_link: { link_type: "Any" },
    },
  ],
} as unknown as Content.SectionGridSlice;

describe("SectionGrid slice", () => {
  it("renders one grid cell per item", () => {
    const { getByRole, getAllByRole } = render(SectionGrid, {
      props: { slice },
    });
    expect(getByRole("heading", { level: 2 }).textContent).toContain("Features");
    expect(getAllByRole("heading", { level: 3 })).toHaveLength(2);
  });

  it("reflects the column count on the grid container", () => {
    const { container } = render(SectionGrid, { props: { slice } });
    const grid = container.querySelector("[data-grid-columns='3']");
    expect(grid).not.toBeNull();
  });
});

describe("SectionGrid onDark variation", () => {
  const rt = (kind: string, text: string) => [{ type: kind, text, spans: [] }];
  const onDark = {
    slice_type: "section_grid",
    variation: "onDark",
    primary: {
      heading: [],
      outro: rt("paragraph", "Together, TOSA and Vida Legacy Foundation provide support."),
      cta_label: "Who we are",
      cta_link: { link_type: "Web", url: "https://example.com/about" },
    },
    items: [
      {
        item_heading: rt("heading3", "Independent but Connected"),
        item_body: rt("paragraph", "A separate 501(c)(3)."),
      },
      {
        item_heading: rt("heading3", "Local Impact"),
        item_body: rt("paragraph", "Support stays in Texas."),
      },
    ],
  };

  it("renders a card per item plus the closing CTA cell", () => {
    const { container } = render(SectionGrid, { props: { slice: onDark as never } });
    expect(container.querySelectorAll(".grid-card").length).toBe(2);
    const link = container.querySelector("a");
    expect(link?.textContent).toContain("Who we are");
    expect(link?.getAttribute("href")).toBe("https://example.com/about");
  });

  it("sits in the columns band's right-hand column unless asked to fill", () => {
    const { container, rerender } = render(SectionGrid, { props: { slice: onDark as never } });
    const grid = container.querySelector(".grid-card")?.parentElement;
    expect(grid?.className).toContain("md:w-[73.63%]");
    rerender({ slice: { ...onDark, primary: { ...onDark.primary, layout: "fill" } } as never });
    expect(container.querySelector(".grid-card")?.parentElement?.className).not.toContain(
      "md:w-[73.63%]",
    );
  });

  it("does NOT fall through to the media-inferred modes", () => {
    // The regression this guards: these items carry text and no media, which
    // the mode heuristic reads as "copy" — a stacked column, not a card grid.
    // onDark must branch before that heuristic runs.
    const { container } = render(SectionGrid, { props: { slice: onDark as never } });
    expect(container.querySelector(".grid-card")).not.toBeNull();
  });

  it("keeps item headings as real headings for document structure", () => {
    const { container } = render(SectionGrid, { props: { slice: onDark as never } });
    // Styled down to the comp's small tracked label, but still an h3 — the
    // scale is overridden in CSS rather than the element downgraded to a <p>.
    expect(container.querySelectorAll("h3").length).toBe(2);
  });

  it("omits the closing cell when neither outro nor CTA is authored", () => {
    const bare = {
      ...onDark,
      primary: { heading: [], outro: [], cta_label: "", cta_link: { link_type: "Any" } },
    };
    const { container } = render(SectionGrid, { props: { slice: bare as never } });
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelectorAll(".grid-card").length).toBe(2);
  });
});
