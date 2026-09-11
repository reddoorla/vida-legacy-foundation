import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  shouldPlayHeroVideo,
  watchWide,
  HERO_VIDEO_MEDIA,
  HERO_VIDEO_MIN_WIDTH,
  coverBox,
  videoCovers,
  VIDEO_ASPECT,
} from "./heroVideo";

const state = (over: Partial<Parameters<typeof shouldPlayHeroVideo>[0]> = {}) => ({
  hasVideo: true,
  reducedMotion: false,
  wide: true,
  ...over,
});

describe("shouldPlayHeroVideo", () => {
  it("plays for a wide client with motion allowed and a clip to play", () => {
    expect(shouldPlayHeroVideo(state())).toBe(true);
  });

  it("declines with no clip — the slice still has only an image, as it shipped", () => {
    expect(shouldPlayHeroVideo(state({ hasVideo: false }))).toBe(false);
  });

  it("declines under reduced motion, which must never get a ten-second loop", () => {
    expect(shouldPlayHeroVideo(state({ reducedMotion: true }))).toBe(false);
  });

  it("declines on a phone, which gets the face-aware portrait crop instead", () => {
    expect(shouldPlayHeroVideo(state({ wide: false }))).toBe(false);
  });

  it("needs every condition, not a majority of them", () => {
    for (const key of ["hasVideo", "reducedMotion", "wide"] as const) {
      const flipped = state({ [key]: key === "reducedMotion" });
      expect(shouldPlayHeroVideo(flipped)).toBe(false);
    }
  });
});

describe("the video threshold and the image's portrait breakpoint", () => {
  // Two numbers that both mean "is this a phone" drift apart the moment one of
  // them is edited alone: the video would mount over a crop it does not match,
  // or leave a gap where neither applies. The slice's portraitMedia is the
  // authority; this asserts the constant still tracks it.
  it("are the same number", () => {
    // resolve from the project root: under jsdom, import.meta.url is not a file: URL.
    const slice = readFileSync(
      resolve(process.cwd(), "src/lib/slices/HeartHero/index.svelte"),
      "utf8",
    );
    const match = slice.match(/portraitMedia="\(max-width:\s*(\d+)px\)"/);
    expect(match, "HeartHero should pass portraitMedia to HeroBackgroundImage").toBeTruthy();
    expect(Number(match![1])).toBe(HERO_VIDEO_MIN_WIDTH - 1);
  });
});

describe("watchWide", () => {
  const realMatchMedia = window.matchMedia;
  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      value: realMatchMedia,
      configurable: true,
      writable: true,
    });
  });

  const stub = (matches: boolean) => {
    const listeners = new Set<(e: MediaQueryListEvent) => void>();
    const mq = {
      matches,
      media: HERO_VIDEO_MEDIA,
      addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) =>
        listeners.delete(fn),
    };
    const matchMedia = vi.fn(() => mq);
    Object.defineProperty(window, "matchMedia", {
      value: matchMedia,
      configurable: true,
      writable: true,
    });
    return { mq, listeners, matchMedia };
  };

  it("reports the current answer immediately, against the shared media string", () => {
    const { matchMedia } = stub(true);
    const seen: boolean[] = [];
    watchWide((w) => seen.push(w));
    expect(matchMedia).toHaveBeenCalledWith(HERO_VIDEO_MEDIA);
    expect(seen).toEqual([true]);
  });

  it("reports a change — a desktop window dragged narrow drops the clip", () => {
    const { listeners } = stub(true);
    const seen: boolean[] = [];
    watchWide((w) => seen.push(w));
    for (const fn of listeners) fn({ matches: false } as MediaQueryListEvent);
    expect(seen).toEqual([true, false]);
  });

  it("stops listening when torn down", () => {
    const { listeners } = stub(true);
    const stop = watchWide(() => {});
    expect(listeners.size).toBe(1);
    stop();
    expect(listeners.size).toBe(0);
  });

  it("answers false with no matchMedia, so a server renders no video element", () => {
    Object.defineProperty(window, "matchMedia", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const seen: boolean[] = [];
    const stop = watchWide((w) => seen.push(w));
    expect(seen).toEqual([false]);
    expect(stop).toBeTypeOf("function");
    stop();
  });
});

describe("coverBox", () => {
  it("covers every stage shape the hero is used at", () => {
    // An iframe letterboxes inside its box instead of cropping, and a bar
    // inside the heart is the green ground showing through a hole in the
    // photograph — so a shortfall on either axis is a visible defect, not a
    // rounding nicety.
    for (const [w, h] of [
      [1440, 860], // the comp's own band
      [1425, 860], // a maximised 1440 window, which is 1425 of viewport
      [768, 900], // the narrowest stage that still gets a player, portrait
      [2560, 1080],
      [3440, 1440],
    ]) {
      expect(videoCovers(w, h), `${w}x${h}`).toBe(true);
    }
  });

  it("keeps the player's own 16:9 aspect, whatever the stage is", () => {
    for (const [w, h] of [
      [1440, 860],
      [768, 900],
      [3440, 1440],
    ]) {
      const { width, height } = coverBox(w, h);
      expect(width / height).toBeCloseTo(VIDEO_ASPECT, 6);
    }
  });

  it("overflows the axis that has to give, and only that one", () => {
    // Worth stating because it is the opposite of the intuition: the comp's
    // 1440x860 band is 1.674, which is NARROWER than the player's 1.778 — so
    // the height matches and the WIDTH spills, by 89px, 44 off each edge. A
    // stage wider than 16:9 swaps the roles.
    const comp = coverBox(1440, 860);
    expect(comp.height).toBeCloseTo(860, 6);
    expect(comp.width).toBeCloseTo(1528.888, 2);

    const ultrawide = coverBox(2560, 1080);
    expect(ultrawide.width).toBeCloseTo(2560, 6);
    expect(ultrawide.height).toBeGreaterThan(1080);
  });

  it("is exact on a stage already at 16:9", () => {
    const { width, height } = coverBox(1920, 1080);
    expect(width).toBeCloseTo(1920, 6);
    expect(height).toBeCloseTo(1080, 6);
  });

  it("yields nothing before the stage is measured, so no player mounts early", () => {
    // The slice renders the player only when both are > 0. A stage measured as
    // 0 during the first frame would otherwise flash a full-bleed embed at the
    // wrong size inside a heart that has not sized itself yet.
    for (const [w, h] of [
      [0, 0],
      [1440, 0],
      [0, 860],
      [-1, 860],
    ]) {
      expect(coverBox(w, h)).toEqual({ width: 0, height: 0 });
    }
  });
});
