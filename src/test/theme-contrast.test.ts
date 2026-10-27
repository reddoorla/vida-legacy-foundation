import { afterEach, describe, expect, it } from "vitest";
import {
  computed,
  contrast,
  declaredAnywhere,
  groundOf,
  svgMainFill,
  textColour,
  themeColour,
} from "./theme-contrast";

// The instrument's own known-good and known-bad inputs. Every contrast keep in
// the suite trusts these answers, so they are proved here against values the
// app.css comment block measured independently.

afterEach(() => {
  document.body.innerHTML = "";
});

function el(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.querySelector("[data-probe]")! as HTMLElement;
}

describe("theme-contrast", () => {
  it("reproduces the ratios app.css records against the cream ground", () => {
    expect(contrast("green-deep", "background")).toBeCloseTo(15.18, 1);
    expect(contrast("green-mid", "background")).toBeCloseTo(4.47, 2);
    expect(contrast("green", "background")).toBeCloseTo(1.94, 2);
    expect(contrast("green-btn", "green")).toBeCloseTo(5.86, 2);
    expect(contrast("white", "green")).toBeCloseTo(2.1, 1);
  });

  it("resolves two utilities on one element the way the built stylesheet orders them", () => {
    // Tailwind emits bg-white after bg-green-deep, so without `!` white wins:
    // the shape of the PersonGrid bio sheet inside Modal.
    const plain = el('<div data-probe class="bg-white bg-green-deep"></div>');
    expect(groundOf(plain)).toEqual(themeColour("white"));
    const important = el('<div data-probe class="bg-white bg-green-deep!"></div>');
    expect(groundOf(important)).toEqual(themeColour("green-deep"));
  });

  it("inherits text colour and walks out to the first opaque ground", () => {
    const span = el('<div class="bg-dark text-background"><p><span data-probe>x</span></p></div>');
    expect(textColour(span)).toEqual(themeColour("background"));
    expect(groundOf(span)).toEqual(themeColour("dark"));
  });

  it("reads the body's own ground and the UA's black when nothing sets either", () => {
    const p = el("<p data-probe>x</p>");
    expect(groundOf(p)).toEqual(themeColour("background"));
    expect(textColour(p)).toEqual(themeColour("black"));
  });

  it("keeps a translucent ground translucent, and lays it over what is given", () => {
    const bar = el('<nav data-probe class="bg-background/95"></nav>');
    expect(groundOf(bar, { within: bar, under: "dark" }).a).toBe(1);
    expect(contrast("primary", groundOf(bar, { within: bar, under: "dark" }))).toBeGreaterThan(6);
    const clear = el('<nav data-probe class="bg-transparent"></nav>');
    expect(groundOf(clear, { within: clear, under: "green" })).toEqual(themeColour("green"));
  });

  it("reads plain properties and the declarations a variant hides", () => {
    const box = el('<div data-probe class="relative sm:aspect-square -translate-y-full"></div>');
    expect(computed(box, "position")).toBe("relative");
    expect(computed(box, "aspect-ratio")).toBeUndefined();
    expect(declaredAnywhere(box, "aspect-ratio")).toEqual(["1 / 1"]);
    expect(computed(box, "--tw-translate-y")).toBe("-100%");
  });

  it("draws text at its own and its ancestors' opacity, as a browser composites it", () => {
    // text-primary on the cream is 7.71:1 at full ink; at 30% it is 1.67:1.
    const full = el('<p><span data-probe class="text-primary">x</span></p>');
    expect(contrast(textColour(full), groundOf(full))).toBeCloseTo(7.71, 1);
    const faint = el('<p><span data-probe class="text-primary opacity-30">x</span></p>');
    expect(contrast(textColour(faint), groundOf(faint))).toBeCloseTo(1.67, 1);
    // An ancestor's opacity multiplies in: 50% of 60% is 30%.
    const nested = el(
      '<div class="opacity-50"><p class="opacity-60"><span data-probe class="text-primary">x</span></p></div>',
    );
    expect(textColour(nested).a).toBeCloseTo(0.3, 5);
    expect(contrast(textColour(nested), groundOf(nested))).toBeCloseTo(1.67, 1);
  });

  it("refuses a ground drawn inside a faded element instead of measuring it", () => {
    const span = el('<div class="opacity-50 bg-dark"><span data-probe>x</span></div>');
    expect(() => groundOf(span)).toThrow(/opacity 0.50 is not modelled/);
  });

  it("reads a lockup's wordmark fill from the shipped file", () => {
    expect(svgMainFill("/logo-lockup.svg")).toEqual(themeColour("primary"));
    expect(svgMainFill("/logo-lockup-cream.svg")).toEqual(themeColour("background"));
  });
});
