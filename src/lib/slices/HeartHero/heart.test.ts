import { describe, it, expect } from "vitest";
import {
  heartEndPct,
  heartCovers,
  HEART_END_PCT,
  playedThisSession,
  shouldAutoOpen,
} from "./heart";

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

describe("shouldAutoOpen", () => {
  // Erik and Nicole asked for the hero to open on its own rather than wait for
  // a visitor to know to scroll (Discord, 2026-09-03).
  const arrived = {
    reducedMotion: false,
    alreadyPlayed: false,
    scrollY: 0,
    documentTop: 0,
    runway: 1500,
  };

  it("plays for a visitor who has just arrived at the top", () => {
    expect(shouldAutoOpen(arrived)).toBe(true);
    // A restored scroll position is rarely exactly 0.
    expect(shouldAutoOpen({ ...arrived, scrollY: 3, documentTop: 2 })).toBe(true);
  });

  it("never scrolls a reduced-motion visitor, who is already on the open frame", () => {
    expect(shouldAutoOpen({ ...arrived, reducedMotion: true })).toBe(false);
  });

  it("runs once, and never for a reader who has already moved", () => {
    expect(shouldAutoOpen({ ...arrived, alreadyPlayed: true })).toBe(false);
    expect(shouldAutoOpen({ ...arrived, scrollY: 200 })).toBe(false);
  });

  it("ignores a hero that is not the top of the page, or has no runway", () => {
    // The a11y fixtures render one half way down a page of components.
    expect(shouldAutoOpen({ ...arrived, documentTop: 900 })).toBe(false);
    expect(shouldAutoOpen({ ...arrived, runway: 0 })).toBe(false);
  });
});

describe("playedThisSession", () => {
  // The mark is what stops the opening replaying on every soft navigation back
  // to the home page. It is NOT meant to survive a refresh: a visitor who
  // reloads at the top of the page lands on frame 0 — closed heart, no eyebrow,
  // no heading, no buttons, no bar — and the mark used to hold them there for
  // the rest of the session.
  it("keeps the mark across a soft navigation back to the home page", () => {
    expect(playedThisSession("1", "navigate")).toBe(true);
    expect(playedThisSession("1", "back_forward")).toBe(true);
    // No Navigation Timing entry at all (an old browser, jsdom): trust the mark.
    expect(playedThisSession("1", undefined)).toBe(true);
  });

  it("discards the mark on a reload, so the refreshed hero opens again", () => {
    expect(playedThisSession("1", "reload")).toBe(false);
  });

  it("is unplayed when there is no mark, however the page was reached", () => {
    for (const type of ["navigate", "reload", "back_forward", undefined]) {
      expect(playedThisSession(null, type)).toBe(false);
    }
  });
});
