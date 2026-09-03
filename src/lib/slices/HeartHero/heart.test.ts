import { describe, it, expect } from "vitest";
import { heartEndPct, heartCovers, HEART_END_PCT } from "./heart";

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
});
