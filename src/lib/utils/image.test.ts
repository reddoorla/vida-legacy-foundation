import { describe, it, expect } from "vitest";
import {
  isPrismicImageUrl,
  imgix,
  srcset,
  DEFAULT_IMAGE_WIDTHS,
  portraitSrcset,
  PORTRAIT_HERO_ASPECT,
} from "./image";

const PRISMIC_URL = "https://images.prismic.io/repo/abc123_hero.jpg?auto=compress";

describe("isPrismicImageUrl", () => {
  it("accepts a Prismic imgix URL", () => {
    expect(isPrismicImageUrl(PRISMIC_URL)).toBe(true);
  });

  it("rejects other hosts", () => {
    expect(isPrismicImageUrl("https://example.com/hero.jpg")).toBe(false);
  });

  it("rejects URLs that only mention the host in their path", () => {
    expect(isPrismicImageUrl("https://evil.example/images.prismic.io/hero.jpg")).toBe(false);
  });

  it("rejects null, undefined, empty, and malformed input", () => {
    expect(isPrismicImageUrl(null)).toBe(false);
    expect(isPrismicImageUrl(undefined)).toBe(false);
    expect(isPrismicImageUrl("")).toBe(false);
    expect(isPrismicImageUrl("not a url")).toBe(false);
  });
});

describe("imgix", () => {
  it("returns empty string for missing URLs", () => {
    expect(imgix(null)).toBe("");
    expect(imgix(undefined)).toBe("");
    expect(imgix("")).toBe("");
  });

  it("returns non-Prismic URLs unchanged", () => {
    expect(imgix("https://example.com/hero.jpg", { w: 100 })).toBe("https://example.com/hero.jpg");
    expect(imgix("not a url")).toBe("not a url");
  });

  it("always sets auto=format,compress", () => {
    const url = new URL(imgix(PRISMIC_URL));
    expect(url.searchParams.get("auto")).toBe("format,compress");
  });

  it("applies params and overrides existing query values", () => {
    const url = new URL(imgix(`${PRISMIC_URL}&w=4000`, { w: 800, q: 60 }));
    expect(url.searchParams.get("w")).toBe("800");
    expect(url.searchParams.get("q")).toBe("60");
  });

  it("preserves unrelated existing query params", () => {
    const url = new URL(imgix(`${PRISMIC_URL}&rect=0,0,100,100`, { w: 800 }));
    expect(url.searchParams.get("rect")).toBe("0,0,100,100");
  });

  // Prismic crop URLs ship rect + w + h together. If only `w` is overridden,
  // the stale `h` plus imgix's default fit=clip caps the real output width —
  // the srcset descriptor then lies about the delivered pixels.
  const CROP_URL = `${PRISMIC_URL}&rect=120,80,2400,1350&w=2400&h=1350`;

  it("drops a stale pre-existing h when the caller sets only w (Prismic crop URL)", () => {
    const url = new URL(imgix(CROP_URL, { w: 800 }));
    expect(url.searchParams.get("w")).toBe("800");
    expect(url.searchParams.has("h")).toBe(false);
    expect(url.searchParams.get("rect")).toBe("120,80,2400,1350");
  });

  it("drops a stale pre-existing w when the caller sets only h", () => {
    const url = new URL(imgix(CROP_URL, { h: 600 }));
    expect(url.searchParams.get("h")).toBe("600");
    expect(url.searchParams.has("w")).toBe(false);
  });

  it("keeps both dimensions when the caller sets both", () => {
    const url = new URL(imgix(CROP_URL, { w: 800, h: 450 }));
    expect(url.searchParams.get("w")).toBe("800");
    expect(url.searchParams.get("h")).toBe("450");
  });

  it("leaves pre-existing w/h alone when the caller sets neither", () => {
    const url = new URL(imgix(CROP_URL, { q: 60 }));
    expect(url.searchParams.get("w")).toBe("2400");
    expect(url.searchParams.get("h")).toBe("1350");
  });
});

describe("srcset", () => {
  it("returns undefined for non-Prismic URLs so the attribute can be omitted", () => {
    expect(srcset("https://example.com/hero.jpg")).toBeUndefined();
    expect(srcset(null)).toBeUndefined();
    expect(srcset(undefined)).toBeUndefined();
  });

  it("builds one candidate per default width", () => {
    const candidates = srcset(PRISMIC_URL)!.split(", ");
    expect(candidates).toHaveLength(DEFAULT_IMAGE_WIDTHS.length);
    for (const [i, width] of DEFAULT_IMAGE_WIDTHS.entries()) {
      expect(candidates[i]).toContain(`w=${width}`);
      expect(candidates[i].endsWith(` ${width}w`)).toBe(true);
    }
  });

  it("accepts a custom width ladder", () => {
    const candidates = srcset(PRISMIC_URL, [320, 640])!.split(", ");
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toContain("w=320");
    expect(candidates[1]).toContain("w=640");
  });

  it("drops the crop URL's h from every candidate so widths aren't clip-capped", () => {
    const cropUrl = `${PRISMIC_URL}&rect=120,80,2400,1350&w=2400&h=1350`;
    const candidates = srcset(cropUrl, [480, 1024])!.split(", ");
    for (const [i, width] of [480, 1024].entries()) {
      const url = new URL(candidates[i].split(" ")[0]);
      expect(url.searchParams.get("w")).toBe(String(width));
      expect(url.searchParams.has("h")).toBe(false);
      expect(url.searchParams.get("rect")).toBe("120,80,2400,1350");
    }
  });
});

describe("portraitSrcset", () => {
  const url = "https://images.prismic.io/repo/abc_hero.jpg";

  it("crops every candidate to the phone's shape, around a face", () => {
    const set = portraitSrcset(url, PORTRAIT_HERO_ASPECT)!;
    const first = set.split(", ")[0];
    expect(first).toContain("w=390");
    // 16/9 of 390, rounded.
    expect(first).toContain("h=693");
    expect(first).toContain("fit=crop");
    expect(first).toContain("crop=faces%2Ccenter");
    expect(first.endsWith(" 390w")).toBe(true);
    // The ladder climbs high enough for a 3x phone.
    expect(set).toContain("1170w");
  });

  it("keeps both dimensions, so the candidate really is portrait", () => {
    // imgix drops the other dimension when only one is set (see imgix()); the
    // portrait ladder must pass both or the crop silently becomes a resize.
    for (const candidate of portraitSrcset(url, 1.5)!.split(", ")) {
      const q = new URL(candidate.split(" ")[0]).searchParams;
      expect(Number(q.get("h"))).toBe(Math.round(Number(q.get("w")) * 1.5));
    }
  });

  it("returns undefined for a non-Prismic url, so the <source> is omitted", () => {
    expect(portraitSrcset("https://example.com/a.jpg", 1.5)).toBeUndefined();
    expect(portraitSrcset(undefined, 1.5)).toBeUndefined();
  });
});
