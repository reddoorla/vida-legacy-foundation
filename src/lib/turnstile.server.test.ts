// @vitest-environment node

import { describe, it, expect } from "vitest";

import { loadTurnstile } from "./turnstile";

/**
 * A separate file for one assertion, because it is the one thing the jsdom
 * suite structurally cannot reach: `turnstile.test.ts` runs in an environment
 * where `window` always exists, so the server guard was reported as
 * "NoCoverage" by the 2026-09-05 mutation audit even with the module otherwise
 * well covered. Emptying the guard survived.
 *
 * It matters because `loadTurnstile` touches `document.head`. Reached during
 * SSR — a component that forgets to gate on the browser, an action that imports
 * it eagerly — an unguarded version throws a ReferenceError mid-render and
 * takes the whole page down, rather than rejecting a promise the caller
 * already handles.
 */
describe("loadTurnstile in a server context", () => {
  it("rejects rather than touching the DOM", async () => {
    expect(typeof window, "this file must run without a DOM").toBe("undefined");
    await expect(loadTurnstile()).rejects.toThrow(/no window/);
  });
});
