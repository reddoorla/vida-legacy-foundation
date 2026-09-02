import { describe, it, expect } from "vitest";
import { navToneFor } from "./nav-tone";

// The fixed Nav has no ground of its own: whatever the page's first slice
// paints under it decides which lockup + icon colouring is legible. Only the
// first slice matters — everything below scrolls under the cream "scrolled"
// bar.
describe("navToneFor", () => {
  it("is the cream-on-green tone over the homepage HeartHero", () => {
    expect(navToneFor([{ slice_type: "heart_hero" }])).toBe("onGreen");
  });

  it("is the cream-and-green tone over an interior PageMasthead", () => {
    expect(navToneFor([{ slice_type: "page_masthead" }])).toBe("onDark");
  });

  it("is the blue default over anything that starts on cream", () => {
    expect(navToneFor([{ slice_type: "lead_text" }])).toBe("default");
    expect(navToneFor([{ slice_type: "cta_banner" }, { slice_type: "heart_hero" }])).toBe(
      "default",
    );
  });

  it("is the default with no slices at all, or no page", () => {
    expect(navToneFor([])).toBe("default");
    expect(navToneFor(undefined)).toBe("default");
    expect(navToneFor(null)).toBe("default");
  });
});
