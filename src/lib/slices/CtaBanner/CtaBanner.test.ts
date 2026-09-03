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
    // app.css .vlf-pill--dark is #263b02 on #9cbf5b.
    const cta = container.querySelector("a");
    expect(cta?.className).toContain("vlf-pill--dark");
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
  it("rounds a full-bleed cream panel over a transparent section", () => {
    // The <section> paints nothing: the band before it is pinned (app.css's
    // slide-over rule) and shows through the 80px corners as the panel slides
    // up over it. The panel itself is the viewport's width — the ground runs
    // edge to edge on a wide screen, only the copy sits on the 1440 grid.
    const { container } = render(CtaBanner, { props: { slice: makeOnCream() } });
    const section = container.querySelector("section");
    expect(section?.className).not.toContain("bg-dark");
    const panel = section?.querySelector("div");
    expect(panel?.className).toContain("bg-background");
    expect(panel?.className).toContain("rounded-t-[80px]");
    expect(panel?.className).toContain("w-full");
    expect(panel?.className).not.toContain("max-w-");
  });

  it("inverts the button couple for the cream ground", () => {
    // #9cbf5b fill + #263b02 text — 5.86:1, the same couple as onDark the
    // other way round. Never white-on-green, which is 2.10.
    // app.css .vlf-pill is #263b02 on #9cbf5b.
    const { container } = render(CtaBanner, { props: { slice: makeOnCream() } });
    const cta = container.querySelector("a");
    expect(cta?.className).toContain("vlf-pill");
    expect(cta?.className).not.toContain("vlf-pill--dark");
    expect(cta?.className).not.toContain("text-white");
  });

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
    // Still paints the panel: the rounded corner is structural, not decoration
    // that can drop out with the copy.
    const panel = container.querySelector("section > div");
    expect(panel?.className).toContain("rounded-t-[80px]");
    expect(container.querySelector("a")).toBeNull();
  });
});
