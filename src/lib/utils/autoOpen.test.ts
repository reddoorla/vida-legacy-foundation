import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AUTO_OPEN_EPSILON, playedThisSession, runAutoOpen, shouldAutoOpen } from "./autoOpen";

describe("shouldAutoOpen", () => {
  const arrived = {
    reducedMotion: false,
    alreadyPlayed: false,
    scrollY: 0,
    documentTop: 0,
    runway: 1200,
  };

  it("plays for a visitor who has just arrived at the top", () => {
    expect(shouldAutoOpen(arrived)).toBe(true);
    expect(shouldAutoOpen({ ...arrived, scrollY: AUTO_OPEN_EPSILON })).toBe(true);
  });

  it("never scrolls a reduced-motion visitor, who is already on the open frame", () => {
    expect(shouldAutoOpen({ ...arrived, reducedMotion: true })).toBe(false);
  });

  it("runs once, and never for a reader who has already moved", () => {
    expect(shouldAutoOpen({ ...arrived, alreadyPlayed: true })).toBe(false);
    expect(shouldAutoOpen({ ...arrived, scrollY: 120 })).toBe(false);
  });

  it("ignores a band that is not the top of the page, or has no runway", () => {
    expect(shouldAutoOpen({ ...arrived, documentTop: 900 })).toBe(false);
    expect(shouldAutoOpen({ ...arrived, runway: 0 })).toBe(false);
  });
});

describe("playedThisSession", () => {
  it("keeps the mark across a soft navigation back to the page", () => {
    expect(playedThisSession("1", "navigate")).toBe(true);
    expect(playedThisSession("1", undefined)).toBe(true);
  });

  it("discards the mark on a reload, so the refreshed band opens again", () => {
    expect(playedThisSession("1", "reload")).toBe(false);
  });

  it("is unplayed when there is no mark, however the page was reached", () => {
    expect(playedThisSession(null, "navigate")).toBe(false);
    expect(playedThisSession(null, "reload")).toBe(false);
  });
});

describe("runAutoOpen", () => {
  const VIEWPORT = 800;
  let scrolled: number[] = [];

  /** A band `height` tall whose top is `top` from the viewport's top. */
  const band = (height: number, top = 0) => {
    const el = document.createElement("section");
    el.getBoundingClientRect = () =>
      ({ top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top }) as DOMRect;
    return el;
  };

  const play = (over = 3000) => vi.advanceTimersByTime(2000 + over);

  beforeEach(() => {
    vi.useFakeTimers();
    scrolled = [];
    sessionStorage.clear();
    document.documentElement.style.scrollBehavior = "";
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "innerHeight", {
      value: VIEWPORT,
      writable: true,
      configurable: true,
    });
    window.scrollTo = ((_x: number, y: number) => {
      scrolled.push(y);
      Object.defineProperty(window, "scrollY", { value: y, writable: true, configurable: true });
    }) as typeof window.scrollTo;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("scrolls the runway for a visitor who has just arrived", () => {
    // 2400 tall over an 800 viewport is a 1600 runway; 0.8 through it is 1280.
    const stop = runAutoOpen({ section: band(2400), reducedMotion: false, key: "k", through: 0.8 });
    play();
    expect(scrolled.at(-1)).toBeCloseTo(1280, 0);
    stop();
  });

  it("eases to the target, never past it, and stops when it arrives", () => {
    // Three things the final position alone cannot see. The easing is
    // indistinguishable at t=1 (both directions land on the target), a step
    // that never stops scheduling frames still ends up in the right place, and
    // a run that never cancels leaves the page's own scroll-behaviour borrowed
    // and the gesture listeners attached. All three survived the mutation run
    // that only checked where it finished.
    const TARGET = 1280;
    const stop = runAutoOpen({ section: band(2400), reducedMotion: false, key: "k", through: 0.8 });
    vi.advanceTimersByTime(2000); // the beat
    vi.advanceTimersByTime(900); // half of the 1800ms flight
    const midway = scrolled.at(-1)!;
    // Ease OUT: half way through the time is well past half way through the
    // distance, and it never overshoots.
    expect(midway).toBeGreaterThan(TARGET / 2);
    // And strictly short of it: half way through the beat it is still moving,
    // not already parked on the target.
    expect(midway).toBeLessThan(TARGET);

    vi.advanceTimersByTime(2000);
    expect(scrolled.at(-1)).toBeCloseTo(TARGET, 0);
    const settled = scrolled.length;

    vi.advanceTimersByTime(2000);
    expect(scrolled.length, "it is still scheduling frames after it arrived").toBe(settled);
    expect(
      document.documentElement.style.scrollBehavior,
      "the page's scroll-behaviour was never handed back",
    ).toBe("");
    stop();
  });

  it("leaves a reduced-motion visitor exactly where they are", () => {
    const stop = runAutoOpen({ section: band(2400), reducedMotion: true, key: "k", through: 0.8 });
    play();
    expect(scrolled).toEqual([]);
    stop();
  });

  it("is a suggestion, not a ride: a gesture during the beat calls it off", () => {
    const stop = runAutoOpen({ section: band(2400), reducedMotion: false, key: "k", through: 0.8 });
    window.dispatchEvent(new Event("wheel"));
    play();
    expect(scrolled).toEqual([]);
    stop();
  });

  it("plays once a session, so navigating back does not replay it", () => {
    const first = runAutoOpen({
      section: band(2400),
      reducedMotion: false,
      key: "k",
      through: 0.8,
    });
    play();
    expect(scrolled.length).toBeGreaterThan(0);
    first();

    scrolled = [];
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    const again = runAutoOpen({
      section: band(2400),
      reducedMotion: false,
      key: "k",
      through: 0.8,
    });
    play();
    expect(scrolled).toEqual([]);
    again();
  });

  it("keys the mark per band, so a second page still opens itself", () => {
    // /about and /donate both draw a PageMasthead; opening one must not spend
    // the other's turn.
    const first = runAutoOpen({
      section: band(2400),
      reducedMotion: false,
      key: "a",
      through: 0.8,
    });
    play();
    first();

    scrolled = [];
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    const other = runAutoOpen({
      section: band(2400),
      reducedMotion: false,
      key: "b",
      through: 0.8,
    });
    play();
    expect(scrolled.length).toBeGreaterThan(0);
    other();
  });

  it("declines a band with no runway to scroll", () => {
    const stop = runAutoOpen({ section: band(400), reducedMotion: false, key: "k", through: 0.8 });
    play();
    expect(scrolled).toEqual([]);
    stop();
  });

  it("declines a band that is not the top of the page", () => {
    const stop = runAutoOpen({
      section: band(2400, 900),
      reducedMotion: false,
      key: "k",
      through: 0.8,
    });
    play();
    expect(scrolled).toEqual([]);
    stop();
  });

  it("stops cleanly when the component goes away mid-beat", () => {
    const stop = runAutoOpen({ section: band(2400), reducedMotion: false, key: "k", through: 0.8 });
    stop();
    play();
    expect(scrolled).toEqual([]);
  });
});
