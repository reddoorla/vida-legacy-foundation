import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import Testimonial from "./index.svelte";
import { resolveAvatarAlt } from "./avatarAlt";

afterEach(() => cleanup());

const image = {
  url: "https://img.example/dana.jpg",
  alt: null,
  dimensions: { width: 400, height: 400 },
} as never;

const makeSlice = (primary: Record<string, unknown>) =>
  ({
    slice_type: "testimonial",
    variation: "default",
    primary: {
      label: null,
      quote: null,
      name: null,
      role: null,
      avatar: null,
      ...primary,
    },
    items: [],
  }) as never;

describe("Testimonial slice", () => {
  it("renders the quote inside figure/blockquote with the name as plain text", () => {
    const { container, getByText } = render(Testimonial, {
      props: {
        slice: makeSlice({
          quote: "They shipped in six weeks.",
          name: "Dana Whitfield",
          role: "Director of Operations",
        }),
      },
    });

    const figure = container.querySelector("figure");
    expect(figure).not.toBeNull();
    expect(figure?.querySelector("blockquote")?.textContent).toContain(
      "They shipped in six weeks.",
    );
    expect(figure?.querySelector("figcaption")?.textContent).toContain("Dana Whitfield");
    // The credit is NOT a heading — a name does not title a section.
    expect(figure?.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
    // Carries the slice-identity data attributes for parity with siblings.
    expect(container.querySelector('[data-slice-type="testimonial"]')).not.toBeNull();
    expect(getByText("Director of Operations")).toBeTruthy();
  });

  it("stores the quote bare — the marks are drawn by CSS, not content", () => {
    const { container } = render(Testimonial, {
      props: {
        slice: makeSlice({ quote: "No curly marks in the CMS." }),
      },
    });
    const quote = container.querySelector(".quote");
    expect(quote?.textContent?.trim()).toBe("No curly marks in the CMS.");
    expect(quote?.textContent).not.toContain("“");
  });

  it("renders the label as the section h2", () => {
    const { container } = render(Testimonial, {
      props: {
        slice: makeSlice({ label: "What clients are saying", quote: "Great." }),
      },
    });
    expect(container.querySelector("h2")?.textContent?.trim()).toBe("What clients are saying");
  });

  it("falls back to the credited name for the avatar alt", () => {
    const { container } = render(Testimonial, {
      props: {
        slice: makeSlice({ avatar: image, name: "Dana Whitfield" }),
      },
    });
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("Dana Whitfield");
  });

  it("keeps an unnamed avatar decorative but announces the authored alt", () => {
    const authored = { ...(image as object), alt: "A smiling client" } as never;
    const { container } = render(Testimonial, {
      props: { slice: makeSlice({ avatar: authored }) },
    });
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("A smiling client");
    // Nothing else names the subject, so the alt is repeated visually-hidden.
    expect(container.querySelector(".sr-only")?.textContent).toBe("A smiling client");
  });

  it("renders an empty section when the slice has no content", () => {
    const { container } = render(Testimonial, {
      props: { slice: makeSlice({}) },
    });
    expect(container.querySelector("figure")).toBeNull();
  });
});

const photo = (alt: string) =>
  ({ url: "https://img.example/photo.jpg", alt, dimensions: { width: 930, height: 628 } }) as never;

const makeOnCream = (primary: Record<string, unknown> = {}, items?: unknown[]) =>
  ({
    slice_type: "testimonial",
    variation: "onCream",
    primary: {
      quote: "The Vida Legacy Foundation made a difficult time manageable.",
      name: "Grateful Family Member",
      ...primary,
    },
    items: items ?? [{ image: photo("A patient resting") }, { image: photo("A father and son") }],
  }) as never;

describe("Testimonial onCream variation", () => {
  it("renders the quote and the photo row on the cream ground", () => {
    const { container } = render(Testimonial, { props: { slice: makeOnCream() } });
    const section = container.querySelector('[data-slice-type="testimonial"]');
    expect(section?.getAttribute("data-slice-variation")).toBe("onCream");
    // #065184 quote is 7.71:1 on #fdf5e8; #01263f attribution is 14.37:1.
    expect(section?.className).toContain("bg-background");
    expect(container.querySelector("blockquote")?.textContent).toContain(
      "made a difficult time manageable",
    );
    expect(container.querySelectorAll("li img").length).toBe(2);
  });

  it("adds the em dash to the attribution so the CMS stores the name bare", () => {
    const { container } = render(Testimonial, { props: { slice: makeOnCream() } });
    expect(container.querySelector("figcaption")?.textContent?.trim()).toBe(
      "— Grateful Family Member",
    );
  });

  it("draws no quote marks, unlike the default variation", () => {
    // The ::before/::after glyphs are scoped to .quote, which this variation
    // deliberately does not use — the comp shows the quote unmarked.
    const { container } = render(Testimonial, { props: { slice: makeOnCream() } });
    expect(container.querySelector(".quote")).toBeNull();
  });

  it("drops unfilled images rather than rendering empty cells", () => {
    const { container } = render(Testimonial, {
      props: { slice: makeOnCream({}, [{ image: photo("Kept") }, { image: {} }]) },
    });
    expect(container.querySelectorAll("li").length).toBe(1);
  });

  it("renders the quote alone when no photos are authored", () => {
    const { container } = render(Testimonial, { props: { slice: makeOnCream({}, []) } });
    expect(container.querySelector("blockquote")).not.toBeNull();
    expect(container.querySelector("ul")).toBeNull();
  });

  it("renders the photos alone when no quote is authored", () => {
    const { container } = render(Testimonial, {
      props: { slice: makeOnCream({ quote: null, name: null }) },
    });
    expect(container.querySelector("figure")).toBeNull();
    expect(container.querySelectorAll("li img").length).toBe(2);
  });
});

describe("resolveAvatarAlt", () => {
  it("prefers the authored alt", () => {
    expect(resolveAvatarAlt("Headshot of Dana", "Dana")).toBe("Headshot of Dana");
  });

  it("falls back to the name, then to null", () => {
    expect(resolveAvatarAlt("  ", "Dana")).toBe("Dana");
    expect(resolveAvatarAlt(null, "  ")).toBeNull();
    expect(resolveAvatarAlt(undefined, undefined)).toBeNull();
  });
});
