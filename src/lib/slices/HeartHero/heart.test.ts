import { describe, it, expect } from "vitest";
import { heartEndPct, heartCovers, HEART_END_PCT, HEART_ART_RATIO } from "./heart";

describe("heartEndPct", () => {
  it("reproduces the comp's own end size on the comp's band", () => {
    // 2696.08 of 1440 — the number the slice used to hard-code.
    expect(heartEndPct(1440, 860)).toBeCloseTo(HEART_END_PCT, 1);
  });

  it("grows for a portrait phone, where the comp's percentage left green showing", () => {
    // 390x664: the old 187.2% was 730x637 in a 664-tall viewport.
    expect(heartCovers(HEART_END_PCT, 390, 664)).toBe(false);
    const pct = heartEndPct(390, 664);
    expect(pct).toBeGreaterThan(500);
    expect(heartCovers(pct, 390, 664)).toBe(true);
  });

  it("covers every shape from a tall phone to an ultrawide desktop", () => {
    for (const [w, h] of [
      [320, 568],
      [390, 664],
      [430, 932],
      [820, 1180],
      [1440, 860],
      [2560, 1080],
      [3440, 1440],
    ]) {
      expect(heartCovers(heartEndPct(w, h), w, h)).toBe(true);
    }
  });

  it("never goes below the comp's size on a wide, short stage", () => {
    expect(heartEndPct(2560, 1080)).toBe(HEART_END_PCT);
  });

  it("falls back to the comp's size before the stage is measured", () => {
    expect(heartEndPct(0, 0)).toBe(HEART_END_PCT);
    expect(heartEndPct(1440, 0)).toBe(HEART_END_PCT);
  });

  it("falls back when only the WIDTH is zero — the half the guard's || protects", () => {
    // 2026-09-05 audit (#60): `!(w > 0) || !(h > 0)` → `&&` survived. The
    // height-zero case above passes either way (needed = 0, max() picks the
    // floor); it is the width-zero case that divides by zero and would hand
    // the mask an Infinity% size. That is the collapsed-stage shape from the
    // September build: a measured height on a stage not yet laid out wide.
    expect(heartEndPct(0, 860)).toBe(HEART_END_PCT);
    expect(Number.isFinite(heartEndPct(0, 860))).toBe(true);
  });

  it("falls back on a NaN measurement, the other shape 'not measured' takes", () => {
    // The scoped Stryker run after the boundary tests above still had two
    // survivors on the same guard, both on its height half. For a height of 0
    // the guard is redundant — needed is 0 and Math.max picks the floor — so
    // only NaN reaches past it: without the clause Math.max(187.2, NaN) is
    // NaN and the mask would be sized `NaN%`, which the browser drops
    // entirely — a closed heart. This kills the clause → `true` mutant. The
    // other, `> 0` → `>= 0`, is equivalent: NaN fails both comparisons.
    expect(heartEndPct(1440, NaN)).toBe(HEART_END_PCT);
    expect(heartEndPct(NaN, 860)).toBe(HEART_END_PCT);
  });
});

describe("heartCovers", () => {
  // The audit's other survivors: both `>=` → `>` and the whole expression →
  // `true`. The tests above never sat on the boundary — every stage was either
  // clearly covered or clearly not — so "just touching" was never decided.
  const w = 1000;
  const h = w / HEART_ART_RATIO; // the mask's own height at exactly w wide

  it("counts a mask exactly the stage's width as covering it", () => {
    // pct 100 → maskW === w, and maskW / HEART_ART_RATIO === h.
    expect(heartCovers(100, w, h)).toBe(true);
  });

  it("stops covering the moment either dimension falls short", () => {
    expect(heartCovers(99.999, w, h)).toBe(false); // a hair under width
    expect(heartCovers(100, w, h + 0.001)).toBe(false); // a hair under height
  });

  it("needs BOTH dimensions, not either", () => {
    // `&&` → `||`: a mask exactly wide enough but far too short.
    expect(heartCovers(100, w, h * 2)).toBe(false);
    // ...and one tall enough but too narrow cannot happen at a fixed aspect,
    // so the width check is the one that decides here.
    expect(heartCovers(50, w, 1)).toBe(false);
  });
});
