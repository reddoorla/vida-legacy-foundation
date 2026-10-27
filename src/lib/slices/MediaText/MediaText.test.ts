import { render } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import type { Content } from "@prismicio/client";
import MediaText from "./index.svelte";
import { declaredAnywhere } from "../../../test/theme-contrast";

function makeSlice(variation: "imageRight" | "imageLeft") {
  return {
    slice_type: "media_text",
    variation,
    primary: {
      heading: [{ type: "heading2", text: "Amenities", spans: [] }],
      body: [{ type: "paragraph", text: "A resort-style pool.", spans: [] }],
      media: {
        url: "https://img.example/pool.jpg",
        alt: "Pool",
        dimensions: { width: 800, height: 600 },
      },
    },
    items: [],
  } as unknown as Content.MediaTextSlice;
}

describe("MediaText slice", () => {
  it("renders heading, body, and image with alt", () => {
    const { getByRole } = render(MediaText, {
      props: { slice: makeSlice("imageRight") },
    });
    expect(getByRole("heading", { level: 2 }).textContent).toContain("Amenities");
    expect(getByRole("img").getAttribute("alt")).toBe("Pool");
  });

  // The editor's "Image left" is the whole of that variation: at desktop width
  // the image sits before the copy, and "Image right" keeps it after. jsdom
  // lays nothing out, so this reads the `order` each column declares at the
  // breakpoint (from the compiled stylesheet, 0 when none) and compares the
  // two, then falls back to source order on a tie. No class or order value is
  // named: any way of putting the image first passes.
  // Tailwind emits a negative order as `calc(1 * -1)`.
  const orderValue = (v: string) => {
    const calc = /^calc\(\s*(-?[\d.]+)\s*\*\s*(-?[\d.]+)\s*\)$/.exec(v);
    const n = calc ? Number(calc[1]) * Number(calc[2]) : Number(v);
    if (!Number.isFinite(n)) throw new Error(`cannot read the order "${v}"`);
    return n;
  };
  const lgOrder = (el: Element) => {
    const values = declaredAnywhere(el, "order").map(orderValue);
    return values.length ? values[values.length - 1] : 0;
  };
  const imageFirst = (container: HTMLElement) => {
    const media = container.querySelector("img")!.closest(".mt-media")!;
    const copy = container.querySelector("h2")!.closest(".mt-copy")!;
    const [m, c] = [lgOrder(media), lgOrder(copy)];
    if (m !== c) return m < c;
    return !!(media.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING);
  };

  it("puts the image before the copy for imageLeft and after it for imageRight", () => {
    const left = render(MediaText, { props: { slice: makeSlice("imageLeft") } });
    expect(imageFirst(left.container), "imageLeft").toBe(true);
    left.unmount();
    const right = render(MediaText, { props: { slice: makeSlice("imageRight") } });
    expect(imageFirst(right.container), "imageRight").toBe(false);
  });
});
