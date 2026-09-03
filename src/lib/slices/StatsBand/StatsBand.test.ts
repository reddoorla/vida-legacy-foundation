import { render } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import type { Content } from "@prismicio/client";
import StatsBand from "./index.svelte";

const slice = {
  slice_type: "stats_band",
  variation: "default",
  primary: {
    eyebrow: "By the numbers",
    cta_label: "Register to be an organ donor",
    cta_link: { link_type: "Web", url: "https://registerme.org/" },
  },
  items: [
    { value: 100000, suffix: "+", description: "More than 100,000 people are waiting." },
    { value: 13, suffix: "people", description: "Thirteen people die every day." },
    { value: 30, suffix: "%", description: "A 30% gap you can close in seconds." },
    { value: 8, suffix: "lives", description: "One donor can save up to eight lives." },
  ],
} as unknown as Content.StatsBandSlice;

const withItems = (items: unknown[]) => ({ ...slice, items }) as unknown as Content.StatsBandSlice;

// Queries are scoped to `container`, never the document: this suite has no
// auto-cleanup between renders, so an unscoped getBy* sees every earlier test's
// DOM too and fails on duplicates.
describe("StatsBand slice", () => {
  it("sets slice data attributes", () => {
    const { container } = render(StatsBand, { props: { slice } });
    const section = container.querySelector("[data-slice-type='stats_band']");
    expect(section?.getAttribute("data-slice-variation")).toBe("default");
  });

  it("renders the eyebrow as the section heading", () => {
    // Nothing else in this slice is a heading — the figures are data — so the
    // eyebrow is the h2 rather than a styled <p>.
    const { container } = render(StatsBand, { props: { slice } });
    expect(container.querySelector("h2")?.textContent?.trim()).toBe("By the numbers");
  });

  it("spaces a word suffix and butts a symbol suffix against the digits", () => {
    // The rule that saves authors from hiding a leading space in a Text field,
    // where Prismic would trim it.
    const { container } = render(StatsBand, { props: { slice } });
    const text = container.textContent ?? "";
    expect(text).toContain("100,000+");
    expect(text).toContain("13 people");
    expect(text).toContain("30%");
    expect(text).toContain("8 lives");
  });

  it("coerces a Number field that came back as a string", () => {
    // Slice Machine regeneration is documented in CLAUDE.md as turning Number
    // fields into strings; the component must not render "NaN".
    const { container } = render(StatsBand, {
      props: { slice: withItems([{ value: "42", suffix: "%", description: "Coerced." }]) },
    });
    expect(container.textContent).toContain("42%");
    expect(container.textContent).not.toContain("NaN");
  });

  it("drops a figure whose value is not a number, keeping its description", () => {
    const { container } = render(StatsBand, {
      props: {
        slice: withItems([{ value: null, suffix: "", description: "Copy with no figure." }]),
      },
    });
    expect(container.textContent).toContain("Copy with no figure.");
    expect(container.textContent).not.toContain("NaN");
  });

  it("hangs the CTA off the last figure, once", () => {
    const { container } = render(StatsBand, { props: { slice } });
    const links = container.querySelectorAll("a");
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("href")).toBe("https://registerme.org/");
    // Last column, not its own cell — so it survives the 2-up/1-up reflow.
    const columns = container.querySelectorAll(".grid > div");
    expect(columns[columns.length - 1].contains(links[0])).toBe(true);
    // And it may hang out of that column into the card's padding, which is
    // what the comp's own button does to keep its label on one line.
    expect(links[0].className).toContain("vlf-pill--hang");
  });

  it("keeps four columns from xl up", () => {
    // Not the comp's 1440: a maximized 1440 window is 1425 of viewport once
    // the scrollbar is paid, and that fell back to 2x2.
    const { container } = render(StatsBand, { props: { slice } });
    expect(container.querySelector(".grid")?.className).toContain("xl:grid-cols-4");
  });

  it("renders no CTA when the label or the link is missing", () => {
    const noLabel = { ...slice, primary: { ...slice.primary, cta_label: "" } };
    const { container } = render(StatsBand, {
      props: { slice: noLabel as unknown as Content.StatsBandSlice },
    });
    expect(container.querySelectorAll("a").length).toBe(0);
  });

  it("renders the CTA arrow decoratively", () => {
    const { container } = render(StatsBand, { props: { slice } });
    const arrow = container.querySelector("a img");
    expect(arrow?.getAttribute("alt")).toBe("");
    expect(arrow?.getAttribute("aria-hidden")).toBe("true");
    // A plain <img> on a relative path: <PrismicImage> would send it through
    // asImageWidthSrcSet, which throws "Invalid URL" and 500s the prerender.
    expect(arrow?.hasAttribute("srcset")).toBe(false);
  });

  it("renders with no items at all", () => {
    const { container } = render(StatsBand, { props: { slice: withItems([]) } });
    expect(container.querySelector("[data-slice-type='stats_band']")).not.toBeNull();
    expect(container.querySelector(".grid")).toBeNull();
  });
});
