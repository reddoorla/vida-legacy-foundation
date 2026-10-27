import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import LeadText from "./index.svelte";
import { contrast, groundOf, textColour } from "../../../test/theme-contrast";

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

  it("sets the onDark variation's copy in a colour that clears AA on its ground", () => {
    const onDark = {
      slice_type: "lead_text",
      variation: "onDark",
      primary: { eyebrow: "", body: rt("Dedicated to honoring the gift of life.") },
      items: [],
    } as never;
    const { container } = render(LeadText, { props: { slice: onDark } });
    const section = container.querySelector('[data-slice-type="lead_text"]');
    expect(section?.getAttribute("data-slice-variation")).toBe("onDark");
    // Computed from the @theme tokens, not named: any ground and copy colour
    // a designer picks passes as long as the body copy clears AA on it.
    const copy = container.querySelector(".lead-on-dark p")!;
    expect(contrast(textColour(copy), groundOf(copy))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the default variation's eyebrow and copy readable on whatever ground it paints", () => {
    // Editors can pick the default variation. Whatever it paints, or the page
    // cream under it if it paints nothing, the eyebrow and the body must clear
    // AA body on it, inherited colours included.
    const { container } = render(LeadText, { props: { slice } });
    const eyebrow = container.querySelector("h2")!;
    const copy = container.querySelector("p")!;
    expect(contrast(textColour(eyebrow), groundOf(eyebrow))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(textColour(copy), groundOf(copy))).toBeGreaterThanOrEqual(4.5);
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

  it("renders the statement variation as an h2", () => {
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
    // The copy IS the heading here — there is no eyebrow to promote.
    const h2 = container.querySelector("h2");
    expect(h2?.textContent).toContain("Hope that heals.");
    // The highlight span is what breaks the line (display:block in the
    // scoped style), so the label must survive to the DOM.
    expect(h2?.querySelector(".highlight")?.textContent).toBe("Help that Lasts.");
  });

  it("lays both VLF variations out float-right, or fills on request", () => {
    const body = [{ type: "paragraph", text: "Body.", spans: [] }];
    const onDark = { slice_type: "lead_text", variation: "onDark", primary: { body }, items: [] };
    const { container, rerender } = render(LeadText, { props: { slice: onDark as never } });
    // The layout the editor chose, as companionRun reads it off the section.
    expect(container.querySelector("section")?.dataset.layout).toBe("float-right");
    rerender({ slice: { ...onDark, primary: { body, layout: "fill" } } as never });
    expect(container.querySelector("section")?.dataset.layout).toBe("fill");
    const statement = { ...onDark, variation: "statement" };
    rerender({ slice: statement as never });
    expect(container.querySelector("section")?.dataset.layout).toBe("float-right");
  });

  it("stops pinning the lead paragraph on a screen too short to hold it", () => {
    // Nicole, on Discord (2026-09-09), from a 390x664 phone: "Could we disable
    // the sticky and scroll over in this section so the first paragraph just
    // continues scrolling instead of getting covered?" — the mission paragraph
    // is taller than that viewport, so the columns band slid over it while it
    // was pinned and cut it mid-sentence at "and embraced while connecting".
    // Pinned from `md` up, where the copy fits above the band that covers it;
    // in flow below.
    const body = [{ type: "paragraph", text: "Body.", spans: [] }];
    const onDark = { slice_type: "lead_text", variation: "onDark", primary: { body }, items: [] };
    const { container } = render(LeadText, { props: { slice: onDark as never } });
    expect(container.querySelector("section")?.className).toContain("sticky-cover--from-md");
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
