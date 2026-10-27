import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import CtaBanner from "./index.svelte";
import model from "./model.json";
import { colourOf, contrast, groundOf, textColour } from "../../../test/theme-contrast";

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

  it("paints the selected ground", () => {
    const { container } = render(CtaBanner, {
      props: { slice: makeSlice({ background: "dark" }) },
    });
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-dark");
  });

  // Every ground an editor can pick in the `background` select, read from the
  // model so a new option is covered the day it is added.
  const backgrounds: string[] = model.variations.find((v) => v.id === "default")!.primary
    .background!.config.options;
  for (const background of backgrounds) {
    it(`keeps the heading and the button readable on the ${background} ground`, () => {
      const { getByRole } = render(CtaBanner, { props: { slice: makeSlice({ background }) } });
      const h2 = getByRole("heading", { level: 2 });
      const cta = getByRole("link", { name: "Talk with us" });
      // Resolved through the cascade and inheritance, so a label colour that
      // only reaches the button by inheriting the section's is measured too.
      expect(contrast(textColour(h2), groundOf(h2))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(textColour(cta), groundOf(cta))).toBeGreaterThanOrEqual(4.5);
      // The outline is the button's boundary: a control's 3:1.
      expect(contrast(colourOf(cta, "border-color")!, groundOf(cta))).toBeGreaterThanOrEqual(3);
    });
  }

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
  it("renders the onDark variation", () => {
    const { container } = render(CtaBanner, { props: { slice: makeOnDark() } });
    const section = container.querySelector('[data-slice-type="cta_banner"]');
    expect(section?.getAttribute("data-slice-variation")).toBe("onDark");
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

const makeOnCream = (primary: Record<string, unknown> = {}) =>
  ({
    slice_type: "cta_banner",
    variation: "onCream",
    primary: {
      eyebrow: "Make a contribution",
      heading: [
        {
          type: "heading2",
          text: "We understand this journey. We're there to help.",
          spans: [{ type: "label", start: 28, end: 48, data: { label: "highlight" } }],
        },
      ],
      buttonLabel: "Donate now",
      buttonLink: link,
      ...primary,
    },
    items: [],
  }) as never;

describe("CtaBanner onCream variation", () => {
  it("keeps the highlight label on the display heading", () => {
    // #527e01 is 4.47:1 on cream — large text ONLY, which is why the highlight
    // is scoped to this display-scale heading and used nowhere else on cream.
    const { container } = render(CtaBanner, { props: { slice: makeOnCream() } });
    const h2 = container.querySelector("h2");
    expect(h2?.querySelector(".highlight")?.textContent).toBe("We're there to help.");
  });

  it("keeps the eyebrow out of the outline", () => {
    const { container } = render(CtaBanner, { props: { slice: makeOnCream() } });
    expect(container.querySelectorAll("h1, h2, h3, h4, h5, h6").length).toBe(1);
    expect(container.textContent).toContain("Make a contribution");
  });

  it("survives an empty eyebrow, heading and button", () => {
    const { container } = render(CtaBanner, {
      props: { slice: makeOnCream({ eyebrow: "", heading: [], buttonLabel: "" }) },
    });
    // Still paints the panel; it does not drop out with the copy.
    const panel = container.querySelector("section > div");
    expect(panel).not.toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });
});
