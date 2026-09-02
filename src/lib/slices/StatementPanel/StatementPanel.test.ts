import { render } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import type { Content } from "@prismicio/client";
import StatementPanel from "./index.svelte";

const slice = {
  slice_type: "statement_panel",
  variation: "default",
  primary: {
    statement: [{ type: "heading2", text: "Our mission is to honor the gift of life.", spans: [] }],
    body: [
      { type: "paragraph", text: "Vida Legacy Foundation is an independent 501(c)(3).", spans: [] },
      { type: "paragraph", text: "TOSA and VLF work hand-in-hand.", spans: [] },
    ],
  },
  items: [],
} as unknown as Content.StatementPanelSlice;

// Queries are scoped to `container`, never the document: this suite has no
// auto-cleanup between renders, so an unscoped getBy* sees every earlier test's
// DOM too and fails on duplicates.
describe("StatementPanel slice", () => {
  it("sets slice data attributes", () => {
    const { container } = render(StatementPanel, { props: { slice } });
    const section = container.querySelector("[data-slice-type='statement_panel']");
    expect(section?.getAttribute("data-slice-variation")).toBe("default");
  });

  it("renders the statement as the section heading and every body paragraph", () => {
    const { container } = render(StatementPanel, { props: { slice } });
    expect(container.querySelector("h2")?.textContent).toContain(
      "Our mission is to honor the gift of life.",
    );
    expect(container.querySelectorAll(".richtext-block p").length).toBe(2);
  });

  it("uses the AA-safe green, not the comp's #527e01", () => {
    // The comp sets this at 24px, where #527e01 (4.47:1) clears AA LARGE. But
    // the type clamps to 20px on a phone, which is body size, where it fails —
    // and the axe gate runs one viewport, so it would not catch that. The -aa
    // green is 4.65:1 and compliant across the whole clamp range.
    const { container } = render(StatementPanel, { props: { slice } });
    const statement = container.querySelector(".statement");
    expect(statement?.className).toContain("text-green-mid-aa");
    expect(statement?.className).not.toMatch(/text-green-mid(?!-aa)/);
  });

  it("renders the statement alone when there is no body", () => {
    const noBody = { ...slice, primary: { ...slice.primary, body: [] } };
    const { container } = render(StatementPanel, {
      props: { slice: noBody as unknown as Content.StatementPanelSlice },
    });
    expect(container.querySelector("h2")).not.toBeNull();
    expect(container.querySelector(".panel")).toBeNull();
  });

  it("renders the panel alone when there is no statement", () => {
    const noStatement = { ...slice, primary: { ...slice.primary, statement: [] } };
    const { container } = render(StatementPanel, {
      props: { slice: noStatement as unknown as Content.StatementPanelSlice },
    });
    expect(container.querySelector(".statement")).toBeNull();
    expect(container.querySelector(".panel")).not.toBeNull();
  });

  it("gives the panel no border or shadow — only the grain separates it", () => {
    // The panel's ground is the SAME cream as the page in the comp. Adding a
    // border or shadow to "help" would read as a different design.
    const { container } = render(StatementPanel, { props: { slice } });
    const panel = container.querySelector(".panel");
    expect(panel?.className).not.toMatch(/border|shadow/);
    expect(panel?.querySelector("[aria-hidden='true']")).not.toBeNull();
  });
});
