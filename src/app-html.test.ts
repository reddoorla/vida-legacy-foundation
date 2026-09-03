import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { HEART_END_HEIGHT_RATIO } from "$lib/slices/HeartHero/heart";

// resolve from the project root: under jsdom, import.meta.url is not a file: URL.
const html = readFileSync(resolve(process.cwd(), "src/app.html"), "utf8");

describe("src/app.html", () => {
  // Shipped broken for one afternoon: a comment in this file mentioned
  // `%sveltekit.head%` in prose. SvelteKit substitutes the FIRST occurrence
  // and only the first, so the comment took the whole head — and the injected
  // markup carries Svelte's hydration markers, one of which is `<!--]-->`,
  // whose terminator closed the comment early. The rest of the sentence became
  // visible text at the top of every page, the real placeholder was never
  // substituted and rendered literally, and the head went out in the wrong
  // place. Nothing in the suite noticed: it is not a console error, not an axe
  // violation, and not a type error.
  it.each(["%sveltekit.head%", "%sveltekit.body%", "%lang%"])(
    "names %s exactly once, so the substitution lands where it is meant to",
    (placeholder) => {
      expect(html.split(placeholder).length - 1).toBe(1);
    },
  );

  it("keeps every placeholder out of the comments", () => {
    // Belt and braces: the count above would still pass if the ONE occurrence
    // were the one inside a comment.
    const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
    for (const placeholder of ["%sveltekit.head%", "%sveltekit.body%", "%lang%"]) {
      expect(withoutComments).toContain(placeholder);
    }
  });

  // The no-JS styles live here rather than in the components: Svelte treats a
  // <style> anywhere in a component as its style block and empties it out of
  // the markup, so there is nowhere else to put them.
  describe("the no-JS block", () => {
    // Comments go FIRST: the nav block's own comment contains the word
    // <noscript> in prose, so matching the element against the raw file spans
    // from inside that comment to the nav block's closing tag — which made
    // `blocks` a pair of the wrong things that happened to number two.
    //
    // And the STYLE's contents, not the whole element, so the first selector
    // is not glued to `<noscript><style>` and quietly dropped by the filter
    // below. It was: the triple-class check covered 12 of the 13 selectors and
    // never saw the first one.
    const source = html.replace(/<!--[\s\S]*?-->/g, "");
    const blocks = [
      ...source.matchAll(/<noscript>\s*<style>([\s\S]*?)<\/style>\s*<\/noscript>/g),
    ].map((m) => m[1]);
    // The runway block specifically, NOT the nav one above it. The two need
    // different specificity: the nav beats a (0,1,0) rule in app.css and so
    // doubles its class, this one beats (0,2,0) component rules and triples.
    const noscript = blocks.find((b) => b.includes("heart-hero")) ?? "";

    it("is a block of its own, so the nav's doubled class is not held to this bar", () => {
      expect(blocks.length).toBe(2);
      expect(noscript).not.toBe("");
      expect(noscript, "the runway block leaked into the nav's").not.toContain("nav-nojs");
    });

    it("reveals the copy both runway stages hide until a script runs", () => {
      // Without this, the only <h1> on / and on /about is opacity: 0 for a
      // sighted visitor with no scripts, and nothing on the page reveals it.
      expect(noscript).toMatch(/\.reveal\.reveal\.reveal\s*\{[^}]*opacity:\s*1/);
      expect(noscript).toMatch(/\.hero-bar\.hero-bar\.hero-bar\s*\{[^}]*transform:\s*none/);
      expect(noscript).toMatch(/\.masthead-window[^{]*\{[^}]*--opened:\s*1/);
    });

    it("triples every class, because the component sheets land below this block", () => {
      // Svelte scopes a component rule to (0,2,0) with its hash class, and
      // those sheets arrive with the app's head markup AFTER this one. Two
      // classes would tie and lose on order; one would lose on specificity.
      // Every selector list ahead of a `{`, wherever it sits. THREE earlier
      // versions of this check were quietly partial: one anchored on end-of-
      // line and saw 4 of 13, one dropped the first selector because the
      // `<style>` tag was still glued to it, and one dropped the first
      // selector inside each @media block by not accepting `{` as a
      // predecessor. Hence the exact count rather than a floor — a selector
      // this misses is a selector nothing checks, and it missed silently
      // every time.
      const css = noscript.replace(/\/\*[\s\S]*?\*\//g, "");
      const selectors = [...css.matchAll(/(^|[{};])([^{};@]+)\{/g)]
        .flatMap(([, , list]) => list.split(","))
        .map((s) => s.trim())
        .filter(Boolean);

      expect(selectors, "selector extraction missed some of the block").toHaveLength(13);
      // The exact shape, not a dot count. Counting dots across the whole
      // selector passes `.a.a.a .b`, whose `.b` sits at (0,1,0) and loses to
      // the component rule it was meant to beat — and a filter for a leading
      // "." quietly exempts `h1.reveal` and `:where(.reveal)` too. One class,
      // three times, nothing else: every rule here is that, and a rule that
      // needs to be something else needs this test read again.
      for (const selector of selectors) {
        expect(selector, `${selector} is not one class tripled`).toMatch(/^(\.[a-z][\w-]*)\1\1$/);
      }
    });

    it("sizes the open heart by the ratio heart.ts computes it from", () => {
      // The component sizes the mask against the stage's measured WIDTH; with
      // no script there is no measurement, so this expresses the same heart as
      // a multiple of the stage's HEIGHT instead. The two are algebraically
      // identical, which is only true while this number tracks that constant.
      const pct = noscript.match(/mask-size:\s*auto\s+([\d.]+)%/)?.[1];
      expect(pct, "no mask-size in the no-JS block").toBeDefined();
      expect(Number(pct)).toBeCloseTo(HEART_END_HEIGHT_RATIO * 100, 2);
    });
  });
});
