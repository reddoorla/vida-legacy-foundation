import { afterEach, describe, expect, it, vi } from "vitest";
import { GTAG_LOADER, afterLoadWhenIdle, initAnalytics } from "./analytics";

const config = { measurementId: "G-TEST123", productionHost: "example.org" };
const loaders = () => document.querySelectorAll(`script[src^="${GTAG_LOADER}"]`);
const now = (run: () => void) => run();

afterEach(() => {
  loaders().forEach((s) => s.remove());
  delete window.dataLayer;
  delete window.gtag;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("initAnalytics", () => {
  it("does nothing off the production host", () => {
    expect(initAnalytics(config, "localhost", now)).toBe(false);
    expect(loaders()).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();
  });

  it("does nothing without a measurement id", () => {
    expect(initAnalytics({ productionHost: "example.org" }, "example.org", now)).toBe(false);
    expect(initAnalytics({ ...config, measurementId: "  " }, "example.org", now)).toBe(false);
    expect(initAnalytics(undefined, "example.org", now)).toBe(false);
    expect(loaders()).toHaveLength(0);
  });

  it("does nothing without a production host", () => {
    expect(initAnalytics({ measurementId: "G-TEST123" }, "example.org", now)).toBe(false);
    expect(loaders()).toHaveLength(0);
  });

  it("does not treat a subdomain of the production host as production", () => {
    expect(initAnalytics(config, "preview.example.org", now)).toBe(false);
    expect(loaders()).toHaveLength(0);
  });

  it("appends one async loader for the measurement id on the production host", () => {
    expect(initAnalytics(config, "example.org", now)).toBe(true);
    const [loader, ...rest] = loaders();
    expect(rest).toHaveLength(0);
    expect((loader as HTMLScriptElement).async).toBe(true);
    expect((loader as HTMLScriptElement).src).toBe(`${GTAG_LOADER}?id=G-TEST123`);
  });

  it("appends only one loader when called twice", () => {
    initAnalytics(config, "example.org", now);
    initAnalytics(config, "example.org", now);
    expect(loaders()).toHaveLength(1);
    expect(window.dataLayer).toHaveLength(2);
  });

  it("queues js then config with the id, as arguments objects", () => {
    initAnalytics(config, "example.org", now);
    const [js, cfg] = window.dataLayer as IArguments[];
    expect(Object.prototype.toString.call(js)).toBe("[object Arguments]");
    expect(js![0]).toBe("js");
    expect(js![1]).toBeInstanceOf(Date);
    expect(Array.from(cfg!)).toEqual(["config", "G-TEST123"]);
  });

  it("queues the commands at once but appends the loader only when scheduled", () => {
    let pending: (() => void) | undefined;
    initAnalytics(config, "example.org", (run) => {
      pending = run;
    });
    expect(window.dataLayer).toHaveLength(2);
    expect(loaders()).toHaveLength(0);
    initAnalytics(config, "example.org", now);
    expect(loaders()).toHaveLength(0);
    pending!();
    expect(loaders()).toHaveLength(1);
  });
});

describe("afterLoadWhenIdle", () => {
  it("waits for the load event before running", () => {
    vi.useFakeTimers();
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    const run = vi.fn();
    afterLoadWhenIdle(run);
    vi.runAllTimers();
    expect(run).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("load"));
    vi.runAllTimers();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("runs after an idle turn when the page has already loaded", () => {
    vi.useFakeTimers();
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
    const run = vi.fn();
    afterLoadWhenIdle(run);
    expect(run).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("uses requestIdleCallback when the browser has it", () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
    const ric = vi.fn((cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 50 });
      return 1;
    });
    vi.stubGlobal("requestIdleCallback", ric);
    const run = vi.fn();
    afterLoadWhenIdle(run);
    expect(ric).toHaveBeenCalledWith(expect.any(Function), { timeout: 3000 });
    expect(run).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
