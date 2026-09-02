import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import CtaBanner from "./index.svelte";

afterEach(() => cleanup());

const heading = [{ type: "heading2", text: "Ready to start your project?", spans: [] }];
const link = { link_type: "Web", url: "https://example.com" };

const makeSlice = (primary: Record<string, unknown> = {}) =>
  ({
    slice_type: "cta_banner",
    variation: "default",
    primary: {
      heading,
      buttonLabel: "Talk with us",
      buttonLink: link,
      background: "light",
      ...primary,
    },
    items: [],
  }) as never;

describe("CtaBanner slice", () => {
  it("renders the heading and the CTA as an anchor", () => {
    const { container, getByRole } = render(CtaBanner, {
      props: { slice: makeSlice() },
    });

    expect(getByRole("heading", { level: 2 }).textContent).toContain(
      "Ready to start your project?",
    );
    const cta = getByRole("link", { name: "Talk with us" });
    expect(cta.tagName).toBe("A");
    expect(cta.getAttribute("href")).toBe("https://example.com");
    // A navigating CTA is an <a>, never a <button> nested inside one.
    expect(cta.querySelector("button")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector('[data-slice-type="cta_banner"]')).not.toBeNull();
  });

  it("paints the selected ground and inverts the button on the dark one", () => {
    const { container } = render(CtaBanner, {
      props: { slice: makeSlice({ background: "dark" }) },
    });
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-dark");
    expect(section?.className).toContain("text-white");
    const cta = container.querySelector("a");
    expect(cta?.className).toContain("border-white");
    expect(cta?.className).not.toContain("border-dark");
  });

  it("omits the CTA when the link or the label is missing", () => {
    const { container: noLabel } = render(CtaBanner, {
      props: { slice: makeSlice({ buttonLabel: "" }) },
    });
    expect(noLabel.querySelector("a")).toBeNull();
    cleanup();

    const { container: noLink } = render(CtaBanner, {
      props: { slice: makeSlice({ buttonLink: null }) },
    });
    expect(noLink.querySelector("a")).toBeNull();
  });
});

const makeOnDark = (primary: Record<string, unknown> = {}) =>
  ({
    slice_type: "cta_banner",
    variation: "onDark",
    primary: {
      eyebrow: "Compassion in Action",
      heading: [{ type: "heading2", text: "No family should walk this journey alone.", spans: [] }],
      body: [{ type: "paragraph", text: "Partner with us today.", spans: [] }],
      buttonLabel: "Donate now",
      buttonLink: link,
      ...primary,
    },
    items: [],
  }) as never;

describe("CtaBanner onDark variation", () => {
  it("paints the night-blue ground and the design's button couple", () => {
    const { container } = render(CtaBanner, { props: { slice: makeOnDark() } });
    const section = container.querySelector('[data-slice-type="cta_banner"]');
    expect(section?.getAttribute("data-slice-variation")).toBe("onDark");
    // #01263f ground: the #9cbf5b eyebrow is 7.42:1 and #fdf5e8 copy 14.37:1.
    expect(section?.className).toContain("bg-dark");
    // The comps' couple, 5.86:1 both ways — never white-on-green, which is 2.10.
    const cta = container.querySelector("a");
    expect(cta?.className).toContain("bg-green-btn");
    expect(cta?.className).toContain("text-green");
    expect(cta?.className).not.toContain("text-white");
  });

  it("keeps the eyebrow out of the outline so the statement is the only h2", () => {
    // Unlike LeadText/IconColumns, this variation carries a real heading
    // sentence — promoting the eyebrow too would put two h2s in one section.
    const { container } = render(CtaBanner, { props: { slice: makeOnDark() } });
    const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain("No family should walk this journey alone.");
    expect(container.textContent).toContain("Compassion in Action");
  });

  it("renders the supporting paragraph", () => {
    const { getByText } = render(CtaBanner, { props: { slice: makeOnDark() } });
    expect(getByText("Partner with us today.")).toBeTruthy();
  });

  it("survives an empty eyebrow, body and button", () => {
    const { container } = render(CtaBanner, {
      props: { slice: makeOnDark({ eyebrow: "", body: [], buttonLabel: "" }) },
    });
    expect(container.querySelector('[data-slice-type="cta_banner"]')).not.toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("h2")).not.toBeNull();
  });

  it("does not read the default variation's background select", () => {
    // onDark's primary has no `background` field; reading it unguarded would
    // fall through to the light ground and lose the night-blue band.
    const { container } = render(CtaBanner, { props: { slice: makeOnDark() } });
    const section = container.querySelector("section");
    expect(section?.className).not.toContain("bg-light");
  });
});
