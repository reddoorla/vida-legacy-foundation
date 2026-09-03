import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
});
