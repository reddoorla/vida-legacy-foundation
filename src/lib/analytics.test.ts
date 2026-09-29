import { afterEach, describe, expect, it } from "vitest";
import { GTAG_LOADER, initAnalytics } from "./analytics";

const config = { measurementId: "G-TEST123", productionHost: "example.org" };
const loaders = () => document.querySelectorAll(`script[src^="${GTAG_LOADER}"]`);

afterEach(() => {
  loaders().forEach((s) => s.remove());
  delete window.dataLayer;
  delete window.gtag;
});

describe("initAnalytics", () => {
  it("does nothing off the production host", () => {
    expect(initAnalytics(config, "localhost")).toBe(false);
    expect(loaders()).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();
  });

  it("does nothing without a measurement id", () => {
    expect(initAnalytics({ productionHost: "example.org" }, "example.org")).toBe(false);
    expect(initAnalytics({ ...config, measurementId: "  " }, "example.org")).toBe(false);
    expect(initAnalytics(undefined, "example.org")).toBe(false);
    expect(loaders()).toHaveLength(0);
  });

  it("does nothing without a production host", () => {
    expect(initAnalytics({ measurementId: "G-TEST123" }, "example.org")).toBe(false);
    expect(loaders()).toHaveLength(0);
  });

  it("does not treat a subdomain of the production host as production", () => {
    expect(initAnalytics(config, "preview.example.org")).toBe(false);
    expect(loaders()).toHaveLength(0);
  });

  it("appends one async loader for the measurement id on the production host", () => {
    expect(initAnalytics(config, "example.org")).toBe(true);
    const [loader, ...rest] = loaders();
    expect(rest).toHaveLength(0);
    expect((loader as HTMLScriptElement).async).toBe(true);
    expect((loader as HTMLScriptElement).src).toBe(`${GTAG_LOADER}?id=G-TEST123`);
  });

  it("appends only one loader when called twice", () => {
    initAnalytics(config, "example.org");
    initAnalytics(config, "example.org");
    expect(loaders()).toHaveLength(1);
    expect(window.dataLayer).toHaveLength(2);
  });

  it("queues js then config with the id, as arguments objects", () => {
    initAnalytics(config, "example.org");
    const [js, cfg] = window.dataLayer as IArguments[];
    expect(Object.prototype.toString.call(js)).toBe("[object Arguments]");
    expect(js![0]).toBe("js");
    expect(js![1]).toBeInstanceOf(Date);
    expect(Array.from(cfg!)).toEqual(["config", "G-TEST123"]);
  });
});
