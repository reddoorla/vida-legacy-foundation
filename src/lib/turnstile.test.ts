import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { TurnstileApi } from "./turnstile";

/**
 * This file exists because a mutation audit (2026-09-05) found `turnstile.ts`
 * at a 40% mutation score with no unit test of any kind — the lowest-scoring
 * module in the repo, and the one at the centre of the whole positive-evidence
 * lesson. Every assertion below corresponds to a mutant that survived: the
 * script's `async` and `defer` flipped to false, the `window.turnstile` guard
 * forced both true and false, the `resolve()` call deleted outright, and the
 * whole `onerror` handler emptied. Each of those is a widget that mints no
 * token, which on a `Require Turnstile` site buckets every real lead as spam.
 *
 * `loader` is module-level state, so each test imports a fresh copy through
 * `vi.resetModules()` rather than trying to reset it from outside.
 */

async function freshModule() {
  vi.resetModules();
  return import("./turnstile");
}

const api = () => ({ render: vi.fn(), remove: vi.fn(), reset: vi.fn() }) as TurnstileApi;

const scripts = () => [...document.head.querySelectorAll("script")];
const turnstileScripts = () => scripts().filter((s) => s.src.includes("challenges.cloudflare.com"));

beforeEach(() => {
  document.head.querySelectorAll("script").forEach((s) => s.remove());
  delete window.turnstile;
});

afterEach(() => {
  delete window.turnstile;
});

describe("loadTurnstile", () => {
  it("resolves the already-present global without injecting a script", async () => {
    const existing = api();
    window.turnstile = existing;
    const { loadTurnstile } = await freshModule();

    await expect(loadTurnstile()).resolves.toBe(existing);
    expect(turnstileScripts()).toHaveLength(0);
  });

  it("injects api.js with render=explicit, async AND defer", async () => {
    const { loadTurnstile } = await freshModule();
    void loadTurnstile();

    const [script] = turnstileScripts();
    expect(script, "no api.js script was appended to <head>").toBeTruthy();
    // `render=explicit` is what disables Cloudflare's auto-render scan. Without
    // it the scan runs on first load only, so a SvelteKit SPA navigation into
    // the form leaves the container empty and the form posts with no token.
    expect(script.src).toContain("render=explicit");
    // Asserted separately rather than as part of the src: both flags survived
    // being flipped to false, and a synchronous parser-blocking fetch of a
    // third-party script in <head> is a real regression even though the widget
    // still works.
    expect(script.async, "api.js must not block the parser").toBe(true);
    expect(script.defer).toBe(true);
  });

  it("resolves with the global api.js publishes on load", async () => {
    const { loadTurnstile } = await freshModule();
    const pending = loadTurnstile();

    const loaded = api();
    window.turnstile = loaded;
    turnstileScripts()[0].onload?.(new Event("load"));

    await expect(pending).resolves.toBe(loaded);
  });

  it("rejects when api.js loads but publishes no global", async () => {
    // The 110200 shape: the script fetches fine and the widget never appears.
    // Left unguarded this hangs the caller forever instead of failing.
    const { loadTurnstile } = await freshModule();
    const pending = loadTurnstile();

    turnstileScripts()[0].onload?.(new Event("load"));

    await expect(pending).rejects.toThrow(/window\.turnstile is missing/);
  });

  it("rejects on a network failure, removes the dead tag, and allows a retry", async () => {
    const { loadTurnstile } = await freshModule();
    const pending = loadTurnstile();

    turnstileScripts()[0].onerror?.(new Event("error"));

    await expect(pending).rejects.toThrow(/failed to load/);
    // Both halves of the handler, which survived being emptied wholesale: the
    // dead <script> must not accumulate in <head>...
    expect(turnstileScripts(), "the failed script tag was left in <head>").toHaveLength(0);

    // ...and the cached promise must be cleared, or every later mount awaits a
    // promise that already rejected and the widget can never recover.
    const retry = loadTurnstile();
    expect(turnstileScripts(), "a retry did not re-inject api.js").toHaveLength(1);
    turnstileScripts()[0].onerror?.(new Event("error"));
    await expect(retry).rejects.toThrow(/failed to load/);
  });

  it("loads api.js exactly once across concurrent callers", async () => {
    // Two components mounting in the same tick, or an SPA navigation back into
    // the form: one script, one promise.
    const { loadTurnstile } = await freshModule();
    const first = loadTurnstile();
    const second = loadTurnstile();

    expect(first).toBe(second);
    expect(turnstileScripts()).toHaveLength(1);

    const loaded = api();
    window.turnstile = loaded;
    turnstileScripts()[0].onload?.(new Event("load"));
    await expect(Promise.all([first, second])).resolves.toEqual([loaded, loaded]);
  });
});
