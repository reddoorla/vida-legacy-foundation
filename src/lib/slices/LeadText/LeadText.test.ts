import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import LeadText from "./index.svelte";

afterEach(() => cleanup());

const rt = (text: string) => [{ type: "paragraph", text, spans: [] }];

const slice = {
  slice_type: "lead_text",
  variation: "default",
  primary: {
    eyebrow: "The Challenge",
    body: rt("They needed an identity on a tight timeline."),
  },
  items: [],
} as never;

describe("LeadText slice", () => {
  it("renders the eyebrow as an h2 and the body paragraph", () => {
    const { container, getByText } = render(LeadText, {
      props: { slice },
    });
    const h2 = container.querySelector("h2");
    expect(h2?.textContent?.trim()).toBe("The Challenge");
    expect(getByText("They needed an identity on a tight timeline.")).toBeTruthy();
    // Carries the slice-identity data attributes for parity with siblings.
    expect(container.querySelector('[data-slice-type="lead_text"]')).not.toBeNull();
  });

  it("puts the onDark variation on the dark green ground", () => {
    const onDark = {
      slice_type: "lead_text",
      variation: "onDark",
      primary: { eyebrow: "", body: rt("Dedicated to honoring the gift of life.") },
      items: [],
    } as never;
    const { container } = render(LeadText, { props: { slice: onDark } });
    const section = container.querySelector('[data-slice-type="lead_text"]');
    expect(section?.getAttribute("data-slice-variation")).toBe("onDark");
    // #263b02 against #fdf5e8 body copy is 11.35:1 and against the #9cbf5b
    // highlight is 5.86:1 — both clear AA, which is why this ground was chosen.
    expect(section?.className).toContain("bg-green-btn");
  });

  it("leaves the default variation ungrounded so a site can restyle it", () => {
    const { container } = render(LeadText, { props: { slice } });
    const section = container.querySelector('[data-slice-type="lead_text"]');
    expect(section?.className).not.toContain("bg-green-btn");
  });

  it("omits the heading when no eyebrow is authored", () => {
    const noEyebrow = {
      slice_type: "lead_text",
      variation: "default",
      primary: { eyebrow: "", body: rt("Body only.") },
      items: [],
    } as never;
    const { container, getByText } = render(LeadText, {
      props: { slice: noEyebrow },
    });
    expect(container.querySelector("h2")).toBeNull();
    expect(getByText("Body only.")).toBeTruthy();
  });

  it("renders the statement variation as an h2 on the night-blue ground", () => {
    const statement = {
      slice_type: "lead_text",
      variation: "statement",
      primary: {
        body: [
          {
            type: "heading2",
            text: "Hope that heals. Help that Lasts.",
            spans: [{ type: "label", start: 17, end: 33, data: { label: "highlight" } }],
          },
        ],
      },
      items: [],
    } as never;
    const { container } = render(LeadText, { props: { slice: statement } });
    const section = container.querySelector('[data-slice-type="lead_text"]');
    expect(section?.getAttribute("data-slice-variation")).toBe("statement");
    // #01263f: #fdf5e8 is 14.37:1 and the #9cbf5b highlight 7.42:1.
    expect(section?.className).toContain("bg-dark");
    expect(section?.className).not.toContain("bg-green-btn");
    // The copy IS the heading here — there is no eyebrow to promote.
    const h2 = container.querySelector("h2");
    expect(h2?.textContent).toContain("Hope that heals.");
    // The highlight span is what breaks the line (display:block in the
    // scoped style), so the label must survive to the DOM.
    expect(h2?.querySelector(".highlight")?.textContent).toBe("Help that Lasts.");
  });

  it("renders no eyebrow heading in the statement variation", () => {
    const statement = {
      slice_type: "lead_text",
      variation: "statement",
      primary: { body: [{ type: "heading2", text: "Statement only.", spans: [] }] },
      items: [],
    } as never;
    const { container } = render(LeadText, { props: { slice: statement } });
    expect(container.querySelectorAll("h1, h2, h3, h4, h5, h6").length).toBe(1);
  });
});
